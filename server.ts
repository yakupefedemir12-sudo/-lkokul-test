import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { getFallbackQuestions } from "./src/data/mebCurriculum";
import { DEFAULT_STUDENTS } from "./src/data/defaultStudents";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Initialize Gemini with telemetry
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is not set.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Centralized Persistent Server-side Storage for Cross-Device Synchronization
interface ServerQuizItem {
  id: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  topic: string;
  createdAt: string;
  questions: any[];
}

interface ServerStudentNoteItem {
  studentId: string;
  note: string;
  updatedAt: string;
}

interface DbSchema {
  activeQuiz: ServerQuizItem | null;
  quizzes: ServerQuizItem[];
  students: any[];
  results: any[];
  studentNotes: Record<string, ServerStudentNoteItem>;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

function saveDb(data: DbSchema) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Sunucu Veritabanı] db.json kaydedilemedi:", err);
  }
}

function loadDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);

      // Cleanse any legacy mock / seed data (quiz-meb-4-default or dummy results)
      const cleanedActiveQuiz =
        parsed.activeQuiz && parsed.activeQuiz.id !== 'quiz-meb-4-default'
          ? parsed.activeQuiz
          : null;

      const cleanedQuizzes = Array.isArray(parsed.quizzes)
        ? parsed.quizzes.filter((q: any) => q && q.id && q.id !== 'quiz-meb-4-default')
        : [];

      const cleanedResults = Array.isArray(parsed.results)
        ? parsed.results.filter(
            (r: any) => r && r.quizId !== 'quiz-meb-4-default' && r.id !== 'res-test-1'
          )
        : [];

      return {
        activeQuiz: cleanedActiveQuiz,
        quizzes: cleanedQuizzes,
        students: Array.isArray(parsed.students) && parsed.students.length > 0 ? parsed.students : DEFAULT_STUDENTS,
        results: cleanedResults,
        studentNotes: parsed.studentNotes && typeof parsed.studentNotes === "object" ? parsed.studentNotes : {},
      };
    }
  } catch (err) {
    console.warn("[Sunucu Veritabanı] db.json okunurken uyarı alındı, tertemiz başlangıç yapılıyor:", err);
  }

  // TERTEMİZ BAŞLANGIÇ (Sıfır KM: 0 Sınav, 0 Sonuç, activeQuiz = null, 35 Öğrenci)
  const initialDb: DbSchema = {
    activeQuiz: null,
    quizzes: [],
    students: DEFAULT_STUDENTS,
    results: [],
    studentNotes: {},
  };
  saveDb(initialDb);
  return initialDb;
}

const db = loadDb();
let serverActiveQuiz: ServerQuizItem | null = db.activeQuiz;
let serverStudents: any[] = db.students;
const serverQuizzesMap = new Map<string, ServerQuizItem>();
db.quizzes.forEach((q) => {
  if (q && q.id && q.id !== 'quiz-meb-4-default') {
    serverQuizzesMap.set(q.id, q);
  }
});
if (serverActiveQuiz && serverActiveQuiz.id !== 'quiz-meb-4-default') {
  serverQuizzesMap.set(serverActiveQuiz.id, serverActiveQuiz);
}

const serverResultsMap = new Map<string, any>(); // key: `${quizId}_${studentId}`
db.results.forEach((r) => {
  if (r && r.quizId && r.studentId && r.quizId !== 'quiz-meb-4-default' && r.id !== 'res-test-1') {
    serverResultsMap.set(`${r.quizId}_${r.studentId}`, r);
  }
});
let serverStudentNotes: Record<string, ServerStudentNoteItem> = db.studentNotes || {};

function persistDb() {
  saveDb({
    activeQuiz: serverActiveQuiz,
    quizzes: Array.from(serverQuizzesMap.values()),
    students: serverStudents,
    results: Array.from(serverResultsMap.values()),
    studentNotes: serverStudentNotes,
  });
}

// ==========================================
// 0. POST /api/rehydrate : Render deploy sonrası veya sıfırlanmada tarayıcıdan sunucuyu kurtarır
// ==========================================
app.post("/api/rehydrate", (req, res) => {
  const { activeQuiz, archiveQuizzes, students, results, studentNotes } = req.body;

  let addedQuizzes = 0;
  let addedResults = 0;

  // 1. Quizzes merge by ID (sahte quizleri filtrele)
  if (Array.isArray(archiveQuizzes)) {
    archiveQuizzes.forEach((q: any) => {
      if (q && q.id && q.id !== 'quiz-meb-4-default') {
        if (!serverQuizzesMap.has(q.id)) {
          addedQuizzes++;
        }
        serverQuizzesMap.set(q.id, q);
      }
    });
  }

  // 2. Active Quiz restoration
  if (activeQuiz && activeQuiz.id && activeQuiz.id !== 'quiz-meb-4-default') {
    serverQuizzesMap.set(activeQuiz.id, activeQuiz);
    if (!serverActiveQuiz) {
      serverActiveQuiz = activeQuiz;
    }
  }

  // 3. Results merge by ${quizId}_${studentId}
  if (Array.isArray(results)) {
    results.forEach((r: any) => {
      if (r && r.quizId && r.studentId && r.quizId !== 'quiz-meb-4-default' && r.id !== 'res-test-1') {
        const key = `${r.quizId}_${r.studentId}`;
        if (!serverResultsMap.has(key)) {
          addedResults++;
        }
        serverResultsMap.set(key, r);
      }
    });
  }

  // 4. Student Notes merge
  if (studentNotes && typeof studentNotes === 'object') {
    Object.entries(studentNotes).forEach(([sId, noteObj]: [string, any]) => {
      if (noteObj && noteObj.note) {
        serverStudentNotes[sId] = noteObj;
      }
    });
  }

  // 5. Students list preserve
  if (Array.isArray(students) && students.length > 0) {
    serverStudents = students;
  }

  persistDb();

  console.log(`[Sunucu /api/rehydrate] Akıllı hafıza kurtarma tamamlandı. ${addedQuizzes} yeni sınav, ${addedResults} yeni karne kurtarıldı/birleştirildi.`);

  res.json({
    success: true,
    message: "Veriler başarıyla sunucuya geri yüklendi ve birleştirildi.",
    activeQuiz: serverActiveQuiz,
    archiveQuizzesCount: serverQuizzesMap.size,
    resultsCount: serverResultsMap.size,
  });
});

// POST /api/reset-data : Sistemi tamamen sıfırlar (sıfır km)
app.post("/api/reset-data", (req, res) => {
  serverActiveQuiz = null;
  serverQuizzesMap.clear();
  serverResultsMap.clear();
  serverStudents = DEFAULT_STUDENTS;
  // Preserve notes or clear
  persistDb();
  console.log(`[Sunucu /api/reset-data] Tüm sınav ve sonuç verileri sıfırlandı.`);
  res.json({
    success: true,
    message: "Tüm veriler sıfırlandı, tertemiz başlangıç yapıldı.",
  });
});

// ==========================================
// 1. GET /api/sync : Tek seferde tüm sunucu durumunu döner
// ==========================================
app.get("/api/sync", (req, res) => {
  res.json({
    success: true,
    activeQuiz: serverActiveQuiz,
    archiveQuizzes: Array.from(serverQuizzesMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    }),
    students: serverStudents,
    results: Array.from(serverResultsMap.values()),
    studentNotes: serverStudentNotes,
    serverTime: new Date().toISOString(),
  });
});

// ==========================================
// 2. POST /api/submit-exam : Öğrenci sınav sonucunu sunucuya kaydeder
// ==========================================
app.post("/api/submit-exam", (req, res) => {
  const { result } = req.body;
  if (!result || !result.quizId || !result.studentId) {
    return res.status(400).json({ error: "Geçersiz sınav sonucu nesnesi." });
  }

  const key = `${result.quizId}_${result.studentId}`;
  serverResultsMap.set(key, result);
  persistDb();
  console.log(`[Sunucu /submit-exam] Sonuç kaydedildi: ${result.studentName} (No: ${result.studentNo}) -> Puan: ${result.score}`);
  res.json({
    success: true,
    message: "Sınav sonucu sunucuya kaydedildi.",
    result,
  });
});

// ==========================================
// 3. POST /api/active-quiz : Aktif sınavı günceller veya yayından kaldırır
// ==========================================
app.post("/api/active-quiz", (req, res) => {
  const { quiz } = req.body;
  if (quiz === null || quiz === undefined) {
    serverActiveQuiz = null;
    persistDb();
    console.log(`[Sunucu] Aktif sınav yayından kaldırıldı (boş durum).`);
    return res.json({
      success: true,
      message: "Aktif sınav yayından kaldırıldı.",
      quiz: null,
    });
  }

  if (!quiz.id || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return res.status(400).json({
      error: "Geçersiz veya eksik sınav nesnesi.",
    });
  }

  serverActiveQuiz = quiz;
  serverQuizzesMap.set(quiz.id, quiz);
  persistDb();
  console.log(`[Sunucu] Aktif sınav güncellendi: ${quiz.subjectName} - ${quiz.topic} (${quiz.id})`);

  res.json({
    success: true,
    message: "Aktif sınav sunucuda başarıyla güncellendi.",
    quiz: serverActiveQuiz,
  });
});

// GET: Current Active Quiz from Server
app.get("/api/active-quiz", (req, res) => {
  res.json({
    success: true,
    quiz: serverActiveQuiz,
  });
});

// DELETE: Deactivate / Unpublish Active Quiz
app.delete("/api/active-quiz", (req, res) => {
  serverActiveQuiz = null;
  persistDb();
  console.log(`[Sunucu] Aktif sınav silindi/yayından kaldırıldı.`);
  res.json({
    success: true,
    message: "Aktif sınav yayından kaldırıldı.",
    quiz: null,
  });
});

// ==========================================
// 4. POST /api/update-students : Sınıf listesini sunucuda günceller
// ==========================================
app.post("/api/update-students", (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "Geçersiz öğrenci listesi." });
  }

  serverStudents = students;
  persistDb();
  console.log(`[Sunucu] 35 kişilik sınıf listesi senkronize edildi (${students.length} öğrenci).`);
  res.json({
    success: true,
    message: "Sınıf listesi sunucuda güncellendi.",
    students: serverStudents,
  });
});

// ==========================================
// 5. POST /api/student-note : Öğretmen özel öğrenci gözlem notunu saklar
// ==========================================
app.post("/api/student-note", (req, res) => {
  const { studentId, note } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: "Öğrenci ID zorunludur." });
  }

  serverStudentNotes[studentId] = {
    studentId,
    note: typeof note === "string" ? note.trim() : "",
    updatedAt: new Date().toISOString(),
  };
  persistDb();
  console.log(`[Sunucu] Öğrenci gözlem notu kaydedildi: ${studentId}`);
  res.json({
    success: true,
    message: "Öğrenci gözlem notu başarıyla kaydedildi.",
    studentNotes: serverStudentNotes,
  });
});

// GET: Student Notes
app.get("/api/student-notes", (req, res) => {
  res.json({
    success: true,
    studentNotes: serverStudentNotes,
  });
});

// GET: Fetch Quiz by ID
app.get("/api/quizzes/:id", (req, res) => {
  const { id } = req.params;
  const quiz = serverQuizzesMap.get(id);

  if (!quiz) {
    if (serverActiveQuiz && serverActiveQuiz.id === id) {
      return res.json({ success: true, quiz: serverActiveQuiz });
    }
    return res.status(404).json({
      error: "Sınav bulunamadı.",
    });
  }

  res.json({
    success: true,
    quiz,
  });
});

// DELETE: Delete Quiz from Server Archive
app.delete("/api/quizzes/:id", (req, res) => {
  const { id } = req.params;
  serverQuizzesMap.delete(id);
  if (serverActiveQuiz && serverActiveQuiz.id === id) {
    serverActiveQuiz = null;
  }
  persistDb();
  res.json({ success: true });
});

// POST: Register or Update Quiz in Server Archive
app.post("/api/quizzes", (req, res) => {
  const { quiz } = req.body;
  if (!quiz || !quiz.id) {
    return res.status(400).json({ error: "Sınav ID'si zorunludur." });
  }

  serverQuizzesMap.set(quiz.id, quiz);
  persistDb();
  res.json({ success: true });
});

// GET: List All Quizzes in Server Archive
app.get("/api/quizzes", (req, res) => {
  res.json({
    success: true,
    quizzes: Array.from(serverQuizzesMap.values()),
  });
});

// GET: Results
app.get("/api/results", (req, res) => {
  const { quizId } = req.query;
  const all = Array.from(serverResultsMap.values());
  if (quizId && typeof quizId === "string") {
    return res.json({
      success: true,
      results: all.filter((r) => r.quizId === quizId),
    });
  }
  res.json({
    success: true,
    results: all,
  });
});

// POST: Save Result (Legacy & Direct)
app.post("/api/results", (req, res) => {
  const { result } = req.body;
  if (!result || !result.quizId || !result.studentId) {
    return res.status(400).json({ error: "Geçersiz sınav sonucu." });
  }

  const key = `${result.quizId}_${result.studentId}`;
  serverResultsMap.set(key, result);
  persistDb();
  res.json({ success: true });
});

// DELETE: Clear Results for a Quiz
app.delete("/api/results/:quizId", (req, res) => {
  const { quizId } = req.params;
  for (const [k, v] of serverResultsMap.entries()) {
    if (v.quizId === quizId) {
      serverResultsMap.delete(k);
    }
  }
  persistDb();
  res.json({ success: true });
});

// ==========================================
// YARATICI TEMA VE GÜVENLİ PARSER YARDIMCILARI
// ==========================================
const CREATIVE_THEMES = [
  "uzay araştırması, teleskop gözlemi ve genç astronotlar roket atölyesi",
  "tarihi Erbaa çarşısı, organik köy pazarı ve manav alışverişi",
  "doğa kampı, orman yürüyüşü, çadır kurma ve izcilik macerası",
  "okul bilim şenliği, genç mucitler kulübü ve akıllı robot yarışması",
  "okullar arası spor turnuvası, bayrak koşusu ve dostluk maçı",
  "arkeoloji müzesi gezisi ve antik uygarlıklar kazı keşfi",
  "çevre koruma kulübü, fidan dikimi ve sıfır atık geri dönüşüm projesi",
  "büyülü kütüphane, masal atölyesi ve kitap dedektifliği",
  "köy çiftliği ziyareti, meyve hasat şenliği ve organik tarım",
  "denizaltı akvaryumu gezisi ve mercan resifleri su altı araştırması",
  "uçurtma şenliği, rüzgar türbini enerjisi ve doğa gözlemi",
  "hava durumu gözlem istasyonu ve meteoroloji balonu deneyi",
];

function safeParseQuestions(rawText: string): any[] | null {
  if (!rawText || typeof rawText !== "string") return null;
  let cleaned = rawText.trim();
  // Strip markdown code fences if present (```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Extract JSON array between [ and ]
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn("[JSON Parser] JSON ayrıştırma uyarısı:", err);
  }
  return null;
}

// ==========================================
// AI Quiz Generation Endpoint (Müfredat - Sıcaklık 0.8 & Yüksek Yaratıcılık)
// ==========================================
app.post("/api/generate-quiz", async (req, res) => {
  const { subject, topic, customPrompt } = req.body;

  if (!subject || !topic) {
    return res.status(400).json({
      error: "Ders ve Konu seçimi zorunludur.",
    });
  }

  const ai = getGeminiClient();

  if (!ai) {
    const localQuestions = getFallbackQuestions(subject, topic);
    return res.status(200).json({
      success: true,
      count: localQuestions.length,
      fallbackUsed: true,
      message: "API anahtarı bulunamadı, yerleşik MEB soru havuzundan 20 özgün soru hazırlandı.",
      questions: localQuestions,
      source: "MEB 4. Sınıf Soru Bankası",
    });
  }

  try {
    const randomTheme = CREATIVE_THEMES[Math.floor(Math.random() * CREATIVE_THEMES.length)];
    const randomSeed = Date.now();

    const systemInstruction = `Sen Türkiye Cumhuriyeti MEB (Milli Eğitim Bakanlığı) 4. Sınıf ilkokul müfredatında uzmanlaşmış, yeni nesil ve beceri temelli soru yazımında yetkin kıdemli bir eğitim teknolojileri uzmanısın.
4. sınıf (9-10 yaş) çocuklarının dil becerilerine, anlama kapasitelerine ve MEB Talim Terbiye Kurulu kazanımlarına %100 sadık kalarak çoktan seçmeli sorular hazırlarsın.
Sorularda Türkçe imla ve noktalama kurallarına dikkat et; dil sade, merak uyandırıcı, teşvik edici ve açık olsun.
Her soruda 4 seçenek (A, B, C, D) bulunmalı, sadece tek bir doğru cevap olmalı ve diğer 3 seçenek güçlü pedagojik çeldiriciler içermelidir.`;

    const userPrompt = `MEB 4. Sınıf müfredatına göre aşağıdaki ders ve konudan TAM 20 adet ÇOKTAN SEÇMELİ soru hazırla:
Ders: ${subject}
Konu: ${topic}
${customPrompt ? `Öğretmen Özel Notu: ${customPrompt}` : ""}

DİNAMİK YARATICILIK & BAĞLAM BİLGİSİ:
- Benzersiz Zaman Damgası (Tohum): ${randomSeed}
- Rastgele Hikâye / Hayat Teması: "${randomTheme}"
Sorulardaki kurguları, günlük hayat problemlerini, isimleri ve örnek olayları bu tema etrafında çeşitlendir; ancak daima konunun MEB 4. sınıf kazanımına odaklan.

KESİN VE ZORUNLU KURALLAR:
1. HER ÇAĞRIDA TAMAMEN YENİ, DAHA ÖNCE SORULMAMIŞ VE ÖZGÜN SORULAR ÜRET. Kesinlikle aynı şablonu, sayıları, kalıpları veya isimleri tekrarlama.
2. MEB 4. Sınıf Beceri Temelli ve Yeni Nesil soru tipleri kullan:
   - Günlük hayat problemleri ve mantık-muhakeme soruları,
   - Kısa diyaloglu / konuşma balonlu kurgular,
   - I, II, III öncüllü çıkarım ve doğru/yanlış analiz soruları.
3. TAM 20 soru üret (id: 1'den 20'ye kadar sıralı).
4. 20 sorunun 20'si de birbirinden TAMAMEN FARKLI, özgün, bağımsız ve benzersiz olmalıdır.
5. Soruların başlığında veya metninde "(Kazanım Alıştırması #...)" veya "Tekrar" gibi yapay etiketler KESİNLİKLE yer almayacaktır. Doğrudan özgün soru metnini yaz.
6. Her sorunun options nesnesinde "A", "B", "C", "D" şıkları bulunmalıdır.
7. "correctAnswer" değeri tam olarak "A", "B", "C" veya "D" olmalıdır.
8. "explanation" alanında 4. sınıf çocuğunun anlayacağı 1-2 cümlelik pedagojik çözüm açıklaması olsun.`;

    const schemaConfig = {
      systemInstruction,
      temperature: 0.8,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        description: "20 adet MEB 4. sınıf çoktan seçmeli soru listesi",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            question: { type: Type.STRING },
            options: {
              type: Type.OBJECT,
              properties: {
                A: { type: Type.STRING },
                B: { type: Type.STRING },
                C: { type: Type.STRING },
                D: { type: Type.STRING },
              },
              required: ["A", "B", "C", "D"],
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["id", "question", "options", "correctAnswer"],
        },
      },
    };

    const candidateModels = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
    let response: any = null;
    let modelUsed = candidateModels[0];
    let lastError: any = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i];
      try {
        console.log(`[AI Quiz Generation] Model deneniyor: ${currentModel} (${i + 1}/${candidateModels.length}) - Sıcaklık: 0.8`);
        response = await ai.models.generateContent({
          model: currentModel,
          contents: userPrompt,
          config: schemaConfig,
        });
        modelUsed = currentModel;
        lastError = null;
        break; // Başarılı, döngüden çık
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[AI Quiz Generation] Model '${currentModel}' hata verdi (${err?.status || err?.message || 'Bilinmeyen hata'}).`
        );
        if (i < candidateModels.length - 1) {
          console.log(`[AI Quiz Generation] 2 saniye bekleniyor ve bir sonraki modele geçiliyor: ${candidateModels[i + 1]}...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const textOutput = response?.text?.trim();
    if (!textOutput) {
      throw new Error("Yapay zekâdan boş yanıt alındı.");
    }

    const questions = safeParseQuestions(textOutput);

    // Format & validate that we have valid questions
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error("Geçersiz soru formatı üretildi.");
    }

    // Sanitize question texts: remove any accidental "(Kazanım Alıştırması #...)" or loop prefixes
    const validatedQuestions = questions.slice(0, 20).map((q, idx) => {
      let cleanQ = (q.question || `Soru ${idx + 1}`).trim();
      // Strip any artificial tags if accidentally present
      cleanQ = cleanQ.replace(/\(Kazanım Alıştırması.*?\)/gi, '').trim();

      return {
        id: idx + 1,
        question: cleanQ,
        options: {
          A: q.options?.A || "Seçenek A",
          B: q.options?.B || "Seçenek B",
          C: q.options?.C || "Seçenek C",
          D: q.options?.D || "Seçenek D",
        },
        correctAnswer: (["A", "B", "C", "D"].includes(q.correctAnswer) ? q.correctAnswer : "A") as "A" | "B" | "C" | "D",
        explanation: q.explanation || "Doğru yanıt.",
      };
    });

    return res.json({
      success: true,
      count: validatedQuestions.length,
      questions: validatedQuestions,
      source: modelUsed,
    });
  } catch (error: any) {
    // SIFIR HATA GÜVENCESİ (FAIL-SAFE): Ekrana asla hata basma, sessizce zengin MEB havuzundan başlat
    console.warn("AI Quiz Generation acil durum emniyet sibopu devrede:", error?.message);
    const localQuestions = getFallbackQuestions(subject, topic);

    return res.json({
      success: true,
      count: localQuestions.length,
      fallbackUsed: true,
      questions: localQuestions,
      source: "MEB 4. Sınıf Soru Bankası (Akıllı Yedek)",
    });
  }
});

// ==========================================
// ÇOKLU FOTOĞRAF / EKRAN GÖRÜNTÜSÜ VE PDF AI Quiz Generation Endpoint
// ==========================================
app.post("/api/generate-quiz-pdf", async (req, res) => {
  const { mode, customPrompt, subjectName, topicName } = req.body;
  const rawFiles = Array.isArray(req.body.files) && req.body.files.length > 0 ? req.body.files : null;
  const singleBase64 = req.body.fileBase64 || req.body.pdfBase64;
  const singleName = req.body.fileName || req.body.pdfName || "dosya";
  const singleMime = req.body.mimeType;

  // Normalize files array (supports 1, 2, 3, 4+ photos / screenshots / PDFs)
  let fileList: Array<{ base64: string; mimeType: string; name: string }> = [];

  if (rawFiles) {
    fileList = rawFiles
      .filter((f: any) => f && (f.base64 || f.fileBase64))
      .map((f: any, idx: number) => {
        const raw = f.base64 || f.fileBase64;
        let mime = f.mimeType;
        if (!mime) {
          const match = raw.match(/^data:([^;]+);base64,/);
          if (match && match[1]) mime = match[1];
          else mime = "image/jpeg";
        }
        if (mime === "image/jpg") mime = "image/jpeg";
        return {
          base64: raw.replace(/^data:[^;]+;base64,/, ""),
          mimeType: mime,
          name: f.name || `Sayfa ${idx + 1}`,
        };
      });
  } else if (singleBase64) {
    let mime = singleMime;
    if (!mime) {
      const match = singleBase64.match(/^data:([^;]+);base64,/);
      if (match && match[1]) mime = match[1];
      else {
        const ext = singleName.toLowerCase().split(".").pop();
        if (ext === "png") mime = "image/png";
        else if (ext === "webp") mime = "image/webp";
        else if (ext === "pdf") mime = "application/pdf";
        else mime = "image/jpeg";
      }
    }
    if (mime === "image/jpg") mime = "image/jpeg";
    fileList = [
      {
        base64: singleBase64.replace(/^data:[^;]+;base64,/, ""),
        mimeType: mime,
        name: singleName,
      },
    ];
  }

  // SIFIR HATA GÜVENCESİ: Eğer hiç dosya gelmediyse sessizce MEB havuzundan üret
  if (fileList.length === 0) {
    const matchedSubject = subjectName || "Türkçe";
    const matchedTopic = topicName || "4. Sınıf Genel Değerlendirme Testi";
    const localQuestions = getFallbackQuestions(matchedSubject, matchedTopic);
    return res.json({
      success: true,
      count: localQuestions.length,
      fallbackUsed: true,
      questions: localQuestions,
      source: "MEB 4. Sınıf Soru Bankası (Akıllı Yedek)",
    });
  }

  const ai = getGeminiClient();

  if (!ai) {
    const matchedSubject = subjectName || (mode === "reading_comprehension" ? "Türkçe" : "Matematik");
    const matchedTopic = topicName || fileList[0].name || "4. Sınıf Genel Tekrar";
    const localQuestions = getFallbackQuestions(matchedSubject, matchedTopic);
    return res.status(200).json({
      success: true,
      count: localQuestions.length,
      fallbackUsed: true,
      message: "API anahtarı bulunamadı, yerleşik MEB soru havuzundan 20 soru hazırlandı.",
      questions: localQuestions,
      source: "MEB 4. Sınıf Soru Bankası",
    });
  }

  const isReading = mode === "reading_comprehension";
  const candidateModels = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
  let response: any = null;
  let modelUsed = candidateModels[0];
  let lastError: any = null;

  try {
    const systemInstruction = `Sen Türkiye Cumhuriyeti MEB (Milli Eğitim Bakanlığı) 4. Sınıf ilkokul müfredatında uzmanlaşmış, ölçme ve değerlendirme alanında kıdemli bir eğitim teknolojisi uzmanısın.
Sana iletilen bir veya birden fazla sayfadan oluşan görseldeki (fotoğraflar, ekran görüntüleri, ön/arka sayfalar) veya PDF belgesindeki içeriği baştan sona tek bir bütün olarak analiz ederek 4. sınıf (9-10 yaş) çocuklarının dil gelişimine, pedagojik düzeyine ve MEB kazanımlarına %100 uygun 20 adet çoktan seçmeli (A, B, C, D) soru hazırlarsın.
Her sorunun 4 seçeneği (A, B, C, D), tek bir kesin doğru cevabı ve 4. sınıf çocuğunun anlayacağı 1-2 cümlelik pedagojik çözüm açıklaması (explanation) bulunmalıdır.`;

    const userPrompt = `Görseldeki veya PDF'teki test sorularını / okuma metnini oku, 4. sınıf düzeyinde 4 seçenekli (A, B, C, D) 20 soruya dönüştür.

Yüklenen Belge/Sayfa Sayısı: Toplam ${fileList.length} sayfa / görsel yüklenmiştir.
Dosyalar: ${fileList.map((f, i) => `${i + 1}. Sayfa: ${f.name} (${f.mimeType})`).join(", ")}
Ders: ${subjectName || "Genel / Türkçe"}
Konu: ${topicName || "Ders Çalışması"}
Çalışma Türü: ${isReading ? "Okuma Metni / Konu Anlatımı / Hikaye" : "Hazır Test / Soru Bankası / Sayfalar"}
${customPrompt ? `Öğretmen Özel Yönergesi: ${customPrompt}` : ""}

KESİN VE ZORUNLU KURALLAR:
1. Sana iletilen TÜM SAYFALARI (${fileList.length} adet görsel/belge) bir bütün olarak analiz et. Örneğin bir testin ön ve arka sayfası veya art arda gelen soruları varsa, tüm sayfalardaki soruları ve metinleri eksiksiz birleştir.
2. ${
  isReading
    ? "Tüm sayfalardaki metne, hikayeye veya konu anlatımına dayalı olarak 4. sınıf düzeyinde TAM 20 adet ÇOKTAN SEÇMELİ (A, B, C, D) okuma-anlama, kavrama, çıkarım ve ana fikir sorusu hazırla."
    : "Tüm sayfalardaki test sorularını algıla, dijitalleştir ve interaktif 4 seçenekli teste dönüştür. Eğer sayfalardaki toplam soru 20'den az ise, mevcut soruların konu ve kazanım bağlamını koruyarak 4. sınıf düzeyine uygun benzer sorularla TAM 20 soruya tamamla."
}
3. TAM 20 soru üret (id: 1'den 20'ye kadar sıralı).
4. 20 sorunun 20'si de birbirinden TAMAMEN FARKLI, özgün, bağımsız ve benzersiz olmalıdır.
5. Soruların metninde "(Kazanım Alıştırması #...)" veya "Tekrar" gibi yapay etiketler KESİNLİKLE yer almayacaktır. Doğrudan özgün soru metnini yaz.
6. Her sorunun options nesnesinde "A", "B", "C", "D" şıkları bulunmalıdır.
7. "correctAnswer" kesinlikle "A", "B", "C" veya "D" olmalıdır.
8. "explanation" alanında 4. sınıf öğrencisinin anlayacağı 1-2 cümlelik pedagojik çözüm açıklaması olsun.`;

    const schemaConfig = {
      systemInstruction,
      temperature: 0.5,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        description: "20 adet MEB 4. sınıf çoktan seçmeli soru listesi",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            question: { type: Type.STRING },
            options: {
              type: Type.OBJECT,
              properties: {
                A: { type: Type.STRING },
                B: { type: Type.STRING },
                C: { type: Type.STRING },
                D: { type: Type.STRING },
              },
              required: ["A", "B", "C", "D"],
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["id", "question", "options", "correctAnswer"],
        },
      },
    };

    // Tüm dosyaları tek bir multimodal dizide birleştir
    const multimodalContents = {
      parts: [
        ...fileList.map((f) => ({
          inlineData: {
            data: f.base64,
            mimeType: f.mimeType,
          },
        })),
        {
          text: userPrompt,
        },
      ],
    };

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i];
      try {
        console.log(`[Multimodal Quiz] Model deneniyor: ${currentModel} (${i + 1}/${candidateModels.length}) - Dosya sayısı: ${fileList.length}`);
        response = await ai.models.generateContent({
          model: currentModel,
          contents: multimodalContents,
          config: schemaConfig,
        });
        modelUsed = currentModel;
        lastError = null;
        break; // Başarılı
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[Multimodal Quiz] Model '${currentModel}' hata verdi (${err?.status || err?.message || 'Bilinmeyen hata'}).`
        );
        if (i < candidateModels.length - 1) {
          console.log(`[Multimodal Quiz] 2 saniye bekleniyor ve bir sonraki modele geçiliyor: ${candidateModels[i + 1]}...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const textOutput = response?.text?.trim();
    if (!textOutput) {
      throw new Error("Dosya analizinden boş yanıt alındı.");
    }

    const questions = safeParseQuestions(textOutput);

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error("Geçersiz soru formatı üretildi.");
    }

    const validatedQuestions = questions.slice(0, 20).map((q, idx) => {
      let cleanQ = (q.question || `Soru ${idx + 1}`).trim();
      cleanQ = cleanQ.replace(/\(Kazanım Alıştırması.*?\)/gi, "").trim();

      return {
        id: idx + 1,
        question: cleanQ,
        options: {
          A: q.options?.A || "Seçenek A",
          B: q.options?.B || "Seçenek B",
          C: q.options?.C || "Seçenek C",
          D: q.options?.D || "Seçenek D",
        },
        correctAnswer: (["A", "B", "C", "D"].includes(q.correctAnswer) ? q.correctAnswer : "A") as "A" | "B" | "C" | "D",
        explanation: q.explanation || "Doğru yanıt.",
      };
    });

    return res.json({
      success: true,
      count: validatedQuestions.length,
      questions: validatedQuestions,
      source: `${fileList.length} Sayfa Analizi (${modelUsed})`,
    });
  } catch (error: any) {
    // SIFIR HATA GÜVENCESİ (FAIL-SAFE): Ekrana asla hata basma, sessizce MEB havuzundan 20 soruyla testi başlat
    console.warn("Multimodal analiz acil durum emniyet sibopu devrede:", error?.message);
    const matchedSubject = subjectName || (mode === "reading_comprehension" ? "Türkçe" : "Matematik");
    const matchedTopic = topicName || fileList[0]?.name || "4. Sınıf Genel Tekrar";
    const localQuestions = getFallbackQuestions(matchedSubject, matchedTopic);

    return res.json({
      success: true,
      count: localQuestions.length,
      fallbackUsed: true,
      questions: localQuestions,
      source: "MEB 4. Sınıf Soru Bankası (Akıllı Yedek)",
    });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MEB 4. Sınıf Test Portalı sunucusu http://0.0.0.0:${PORT} adresinde çalışıyor`);
  });
}

startServer();
