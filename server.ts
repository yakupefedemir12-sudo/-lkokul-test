import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { getFallbackQuestions } from "./src/data/mebCurriculum";

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

// In-memory Server-side State for Cross-Device Synchronization
interface ServerQuizItem {
  id: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  topic: string;
  createdAt: string;
  questions: any[];
}

let serverActiveQuiz: ServerQuizItem | null = null;

const serverQuizzesMap = new Map<string, ServerQuizItem>();

const serverResultsMap = new Map<string, any>(); // key: `${quizId}_${studentId}`

// GET: Current Active Quiz from Server
app.get("/api/active-quiz", (req, res) => {
  res.json({
    success: true,
    quiz: serverActiveQuiz,
  });
});

// POST: Update Current Active Quiz on Server (supports null / unpublishing)
app.post("/api/active-quiz", (req, res) => {
  const { quiz } = req.body;
  if (quiz === null || quiz === undefined) {
    serverActiveQuiz = null;
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
  console.log(`[Sunucu] Aktif sınav güncellendi: ${quiz.subjectName} - ${quiz.topic} (${quiz.id})`);

  res.json({
    success: true,
    message: "Aktif sınav sunucuda başarıyla güncellendi.",
    quiz: serverActiveQuiz,
  });
});

// DELETE: Deactivate / Unpublish Active Quiz
app.delete("/api/active-quiz", (req, res) => {
  serverActiveQuiz = null;
  console.log(`[Sunucu] Aktif sınav silindi/yayından kaldırıldı.`);
  res.json({
    success: true,
    message: "Aktif sınav yayından kaldırıldı.",
    quiz: null,
  });
});

// GET: Fetch Quiz by ID
app.get("/api/quizzes/:id", (req, res) => {
  const { id } = req.params;
  const quiz = serverQuizzesMap.get(id);

  if (!quiz) {
    // If it matches active quiz id
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
  res.json({ success: true });
});

// POST: Register or Update Quiz in Server Archive
app.post("/api/quizzes", (req, res) => {
  const { quiz } = req.body;
  if (!quiz || !quiz.id) {
    return res.status(400).json({ error: "Sınav ID'si zorunludur." });
  }

  serverQuizzesMap.set(quiz.id, quiz);
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

// POST: Save Result
app.post("/api/results", (req, res) => {
  const { result } = req.body;
  if (!result || !result.quizId || !result.studentId) {
    return res.status(400).json({ error: "Geçersiz sınav sonucu." });
  }

  const key = `${result.quizId}_${result.studentId}`;
  serverResultsMap.set(key, result);
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
  res.json({ success: true });
});

// AI Quiz Generation Endpoint
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
    const systemInstruction = `Sen Türkiye Cumhuriyeti MEB (Milli Eğitim Bakanlığı) 4. Sınıf ilkokul müfredatında uzmanlaşmış kıdemli bir eğitim teknolojileri uzmanısın.
4. sınıf (9-10 yaş) çocuklarının dil becerilerine, anlama kapasitelerine ve MEB Talim Terbiye Kurulu kazanımlarına %100 sadık kalarak çoktan seçmeli sorular hazırlarsın.
Sorularda Türkçe imla ve noktalama kurallarına dikkat et; dil sade, teşvik edici ve açık olsun.
Her soruda 4 seçenek (A, B, C, D) bulunmalı, sadece tek bir doğru cevap olmalı ve diğer 3 seçenek mantıklı çeldiriciler içermelidir.`;

    const userPrompt = `MEB 4. Sınıf müfredatına göre aşağıdaki ders ve konudan TAM 20 adet ÇOKTAN SEÇMELİ soru hazırla:
Ders: ${subject}
Konu: ${topic}
${customPrompt ? `Öğretmen Özel Notu: ${customPrompt}` : ""}

KESİN VE ZORUNLU KURALLAR:
1. TAM 20 soru üret (id: 1'den 20'ye kadar sıralı).
2. 20 sorunun 20'si de birbirinden TAMAMEN FARKLI, özgün, bağımsız ve benzersiz olmalıdır.
3. Kesinlikle aynı soruyu, aynı hikayeyi veya aynı cümleyi tekrar etme.
4. Soruların başlığında veya metninde "(Kazanım Alıştırması #...)" veya "Tekrar" gibi yapay etiketler KESİNLİKLE yer almayacaktır. Doğrudan özgün soru metnini yaz.
5. Her sorunun options nesnesinde "A", "B", "C", "D" şıkları bulunmalıdır.
6. "correctAnswer" değeri tam olarak "A", "B", "C" veya "D" olmalıdır.
7. "explanation" alanında 4. sınıf çocuğunun anlayacağı 1-2 cümlelik pedagojik çözüm açıklaması olsun.`;

    const schemaConfig = {
      systemInstruction,
      temperature: 0.7,
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

    let response;
    let modelUsed = "gemini-3.1-flash-lite";

    // Try primary fast model, fallback to 3.8-flash if needed
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: userPrompt,
        config: schemaConfig,
      });
    } catch (primaryErr: any) {
      console.warn("gemini-3.1-flash-lite failed, trying gemini-3.8-flash:", primaryErr?.message);
      modelUsed = "gemini-3.8-flash";
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: userPrompt,
        config: schemaConfig,
      });
    }

    const textOutput = response.text?.trim();
    if (!textOutput) {
      throw new Error("Yapay zekâdan boş yanıt alındı.");
    }

    const questions = JSON.parse(textOutput);

    // Format & validate that we have valid questions
    if (!Array.isArray(questions) || questions.length === 0) {
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
    console.error("Gemini quiz generation error, using 20-question authentic fallback:", error?.message);
    const localQuestions = getFallbackQuestions(subject, topic);

    return res.json({
      success: true,
      count: localQuestions.length,
      fallbackUsed: true,
      questions: localQuestions,
      source: "MEB 4. Sınıf Soru Bankası",
    });
  }
});

// PDF & Image-based AI Quiz Generation Endpoint
app.post("/api/generate-quiz-pdf", async (req, res) => {
  const rawBase64 = req.body.fileBase64 || req.body.pdfBase64;
  const rawName = req.body.fileName || req.body.pdfName || "dosya";
  const { mode, customPrompt, subjectName, topicName } = req.body;

  if (!rawBase64) {
    return res.status(400).json({
      error: "Lütfen bir PDF veya görsel dosyası (fotoğraf / ekran görüntüsü) yükleyiniz.",
    });
  }

  const ai = getGeminiClient();

  if (!ai) {
    return res.status(500).json({
      error: "Gemini API anahtarı bulunamadı. Lütfen sistem ayarlarını kontrol ediniz.",
    });
  }

  // Detect MIME type accurately
  let resolvedMimeType = req.body.mimeType;
  if (!resolvedMimeType) {
    const dataUrlMatch = rawBase64.match(/^data:([^;]+);base64,/);
    if (dataUrlMatch && dataUrlMatch[1]) {
      resolvedMimeType = dataUrlMatch[1];
    } else {
      const ext = rawName.toLowerCase().split(".").pop();
      if (ext === "png") resolvedMimeType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") resolvedMimeType = "image/jpeg";
      else if (ext === "webp") resolvedMimeType = "image/webp";
      else if (ext === "gif") resolvedMimeType = "image/gif";
      else resolvedMimeType = "application/pdf";
    }
  }

  if (resolvedMimeType === "image/jpg") {
    resolvedMimeType = "image/jpeg";
  }

  const isImage = resolvedMimeType.startsWith("image/");
  const docTypeLabel = isImage ? "fotoğraf / ekran görüntüsü" : "PDF dokümanı";

  // Strip prefix like "data:image/jpeg;base64," or "data:application/pdf;base64," if present
  const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, "");

  try {
    const isReading = mode === "reading_comprehension";
    const systemInstruction = `Sen Türkiye Cumhuriyeti MEB (Milli Eğitim Bakanlığı) 4. Sınıf ilkokul müfredatında uzmanlaşmış, ölçme ve değerlendirme alanında kıdemli bir eğitim teknolojisi uzmanısın.
Sana iletilen görseldeki (fotoğraf, ekran görüntüsü) veya PDF belgesindeki içeriği baştan sona analiz ederek 4. sınıf (9-10 yaş) çocuklarının dil gelişimine, pedagojik düzeyine ve MEB kazanımlarına %100 uygun 20 adet çoktan seçmeli (A, B, C, D) soru hazırlarsın.
Her sorunun 4 seçeneği (A, B, C, D), tek bir kesin doğru cevabı ve 4. sınıf çocuğunun anlayacağı 1-2 cümlelik pedagojik çözüm açıklaması (explanation) bulunmalıdır.`;

    const userPrompt = `Görseldeki veya PDF'teki test sorularını / okuma metnini oku, 4. sınıf düzeyinde 4 seçenekli (A, B, C, D) 20 soruya dönüştür.

Dosya Bilgisi: ${docTypeLabel} (${rawName})
Ders: ${subjectName || "Genel / Türkçe"}
Konu: ${topicName || rawName || "Ders Çalışması"}
Çalışma Türü: ${isReading ? "Okuma Metni / Konu Anlatımı / Hikaye" : "Hazır Test / Soru Bankası / Ekran Görüntüsü"}
${customPrompt ? `Öğretmen Özel Yönergesi: ${customPrompt}` : ""}

KESİN VE ZORUNLU KURALLAR:
1. Görseldeki (fotoğraf / ekran görüntüsü) veya PDF'teki içeriği (sorular, paragraflar, okuma metni, grafikler veya formüller) eksiksiz tara ve oku.
${
  isReading
    ? "2. Metne, hikayeye veya konu anlatımına dayalı olarak 4. sınıf düzeyinde TAM 20 adet ÇOKTAN SEÇMELİ (A, B, C, D) okuma-anlama, kavrama, çıkarım ve ana fikir sorusu hazırla."
    : "2. Görseldeki veya PDF belgesindeki test sorularını algıla, dijitalleştir ve interaktif 4 seçenekli teste dönüştür. Eğer 20'den az soru varsa, görseldeki/PDF'teki soruların konu bağlamını koruyarak 4. sınıf düzeyine uygun benzer sorularla TAM 20 soruya tamamla."
}
3. TAM 20 soru üret (id: 1'den 20'ye kadar sıralı).
4. 20 sorunun 20'si de birbirinden TAMAMEN FARKLI, özgün, bağımsız ve benzersiz olmalıdır.
5. Soruların metninde "(Kazanım Alıştırması #...)" veya "Tekrar" gibi yapay etiketler KESİNLİKLE yer almayacaktır. Doğrudan özgün soru metnini yaz.
6. Her sorunun options nesnesinde "A", "B", "C", "D" şıkları bulunmalıdır.
7. "correctAnswer" kesinlikle "A", "B", "C" veya "D" olmalıdır.
8. "explanation" alanında 4. sınıf öğrencisinin anlayacağı 1-2 cümlelik pedagojik çözüm açıklaması olsun.`;

    const schemaConfig = {
      systemInstruction,
      temperature: 0.4,
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

    let response;
    let modelUsed = "gemini-3.1-flash-lite";

    const multimodalContents = {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: resolvedMimeType,
          },
        },
        {
          text: userPrompt,
        },
      ],
    };

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: multimodalContents,
        config: schemaConfig,
      });
    } catch (primaryErr: any) {
      console.warn("gemini-3.1-flash-lite multimodal file error, trying gemini-3.8-flash:", primaryErr?.message);
      modelUsed = "gemini-3.8-flash";
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: multimodalContents,
        config: schemaConfig,
      });
    }

    const textOutput = response.text?.trim();
    if (!textOutput) {
      throw new Error("Dosya analizinden boş yanıt alındı.");
    }

    const questions = JSON.parse(textOutput);

    if (!Array.isArray(questions) || questions.length === 0) {
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
      source: isImage ? `Görsel Analizi (${modelUsed})` : `PDF Analizi (${modelUsed})`,
    });
  } catch (error: any) {
    console.error("Multimodal Quiz generation error:", error?.message);
    return res.status(500).json({
      error:
        "Dosya analiz edilirken bir hata oluştu: " + (error?.message || "Lütfen dosyanızı kontrol ediniz."),
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
