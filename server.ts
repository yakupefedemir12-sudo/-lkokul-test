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

// PDF-based AI Quiz Generation Endpoint
app.post("/api/generate-quiz-pdf", async (req, res) => {
  const { pdfBase64, pdfName, mode, customPrompt, subjectName, topicName } = req.body;

  if (!pdfBase64) {
    return res.status(400).json({
      error: "Lütfen bir PDF dosyası yükleyiniz.",
    });
  }

  const ai = getGeminiClient();

  if (!ai) {
    return res.status(500).json({
      error: "Gemini API anahtarı bulunamadı. Lütfen sistem ayarlarını kontrol ediniz.",
    });
  }

  // Strip prefix like "data:application/pdf;base64," if present
  const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, "");

  try {
    const isReading = mode === "reading_comprehension";
    const systemInstruction = `Sen Türkiye Cumhuriyeti MEB (Milli Eğitim Bakanlığı) 4. Sınıf ilkokul müfredatında uzmanlaşmış, ölçme ve değerlendirme alanında kıdemli bir eğitim teknolojisi uzmanısın.
Sana iletilen PDF dokümanını baştan sona analiz ederek 4. sınıf (9-10 yaş) çocuklarının dil gelişimine, pedagojik düzeyine ve MEB kazanımlarına %100 uygun 20 adet çoktan seçmeli (A, B, C, D) soru hazırlarsın.
Her sorunun 4 seçeneği (A, B, C, D), tek bir kesin doğru cevabı ve 4. sınıf çocuğunun anlayacağı 1-2 cümlelik pedagojik çözüm açıklaması (explanation) bulunmalıdır.`;

    const userPrompt = isReading
      ? `Bu ekteki PDF bir OKUMA METNİ / KONU ANLATIMI dokümanıdır (Dosya: ${pdfName || 'belge.pdf'}).
Ders: ${subjectName || 'Türkçe / Genel'}
Konu: ${topicName || pdfName || 'Okuma Anlama ve Kavrama'}
${customPrompt ? `Öğretmen Özel Yönergesi: ${customPrompt}` : ""}

GÖREV:
1. Ekli PDF belgesindeki metni, hikayeyi veya konu anlatımını baştan sona dikkatle oku ve analiz et.
2. Bu metne dayalı olarak 4. sınıf düzeyinde TAM 20 adet ÇOKTAN SEÇMELİ (A, B, C, D) anlama, kavrama, çıkarım ve ana fikir sorusu hazırla.
3. Soruların 20'si de birbirinden tamamen farklı, bağımsız ve özgün olmalıdır.
4. Metindeki ana karakterler, olay örgüsü, sebep-sonuç bağları, ana fikir ve kelime bilgisine odaklan.
5. Soruların başlığında veya metninde "(Kazanım Alıştırması #...)" veya "Tekrar" gibi yapay etiketler KESİNLİKLE yer almayacaktır. Doğrudan özgün soru metnini yaz.
6. correctAnswer kesinlikle "A", "B", "C" veya "D" olmalıdır.
7. explanation alanında 4. sınıf öğrencisinin anlayacağı 1-2 cümlelik çözüm açıklaması olsun.`
      : `Bu ekteki PDF hazır bir YAPRAK TEST / SORU BANKASI dokümanıdır (Dosya: ${pdfName || 'test.pdf'}).
Ders: ${subjectName || 'Genel Değerlendirme'}
Konu: ${topicName || pdfName || 'Yaprak Test'}
${customPrompt ? `Öğretmen Özel Yönergesi: ${customPrompt}` : ""}

GÖREV:
1. Ekli PDF belgesindeki soruları dikkatle algıla, dijitalleştir ve interaktif teste dönüştür.
2. Eğer PDF'te sorular varsa bunları sırayla A, B, C, D seçenekleriyle dijitalleştir.
3. Eğer PDF'te 20'den az soru varsa, PDF'teki soruları ve konu bağlamını koruyarak benzer tarzda ve zorlukta yeni sorular ekle ve toplam soru sayısını TAM 20'ye tamamla.
4. Eğer PDF'te 20'den fazla soru varsa, en kaliteli ve 4. sınıf düzeyine en uygun 20 soruyu seçerek sırala (id: 1'den 20'ye).
5. Her sorunun A, B, C, D seçeneklerini, doğru cevabını (correctAnswer: 'A' | 'B' | 'C' | 'D') ve kısa pedagojik açıklamasını (explanation) oluştur.`;

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
            mimeType: "application/pdf",
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
      console.warn("gemini-3.1-flash-lite PDF error, trying gemini-3.8-flash:", primaryErr?.message);
      modelUsed = "gemini-3.8-flash";
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: multimodalContents,
        config: schemaConfig,
      });
    }

    const textOutput = response.text?.trim();
    if (!textOutput) {
      throw new Error("PDF analizinden boş yanıt alındı.");
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
      source: `PDF Analizi (${modelUsed})`,
    });
  } catch (error: any) {
    console.error("PDF Quiz generation error:", error?.message);
    return res.status(500).json({
      error: "PDF belgesi analiz edilirken bir hata oluştu: " + (error?.message || "Lütfen dosyanızı kontrol ediniz."),
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
