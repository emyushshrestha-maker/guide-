import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to get Gemini AI instance safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Robust Gemini execution helper with automatic retries and model fallbacks
async function callGeminiWithFallback(ai: GoogleGenAI, params: any) {
  const primaryModel = params.model || "gemini-3.6-flash";
  const fallbackModels = ["gemini-3.6-flash", "gemini-3.7-flash"];
  const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]));

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini API attempt failed on model '${model}' (attempt ${attempt + 1}):`, err?.message || err);
        const errStr = String(err?.message || err);
        const isTransient =
          errStr.includes("503") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("RESOURCE_EXHAUSTED") ||
          errStr.includes("high demand") ||
          errStr.includes("429");

        if (isTransient && attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        break;
      }
    }
  }

  throw lastError;
}

// Helper to safely extract and parse JSON from Gemini text response
function cleanAndParseJSON(rawText: string): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  // Strip markdown code block wrappers if model wrapped it
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt substring extraction between first { and last }
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx > startIdx) {
      const jsonSub = cleaned.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonSub);
    }
    throw e;
  }
}

// Clean and format ELI5 / Simplified answers into a cohesive single paragraph with rich analogies
function sanitizeSimplifiedAnswer(text: string): string {
  if (!text || typeof text !== "string") return "";
  let clean = text.trim();

  // Normalize multiple newlines into a single cohesive paragraph
  clean = clean.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();

  // Guard against runaway loop tokens if any repetitive pattern occurs
  const words = clean.split(" ");
  if (words.length > 200) {
    // Keep reasonable rich paragraph length up to ~150 words
    clean = words.slice(0, 150).join(" ");
    const lastPeriod = clean.lastIndexOf(".");
    if (lastPeriod > 50) {
      clean = clean.substring(0, lastPeriod + 1);
    }
  }

  return clean.trim();
}

// Ensure SVG code is valid and self-contained
function sanitizeSVG(svgStr: string, title: string): string {
  if (!svgStr || !svgStr.includes("<svg")) {
    // Fallback graphic generator
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
      <circle cx="300" cy="180" r="70" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
      <path d="M300 110 L300 250 M230 180 L370 180" stroke="#818cf8" stroke-width="3" stroke-dasharray="4 4" />
      <text x="300" y="185" text-anchor="middle" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">${title}</text>
      <text x="300" y="320" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Visual Conceptual Schematic</text>
    </svg>`;
  }

  let cleaned = svgStr.trim();
  // Strip markdown code blocks if model wrapped it
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return cleaned;
}

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// High-Fidelity Gemini AI Voice (TTS) Endpoint
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Zephyr" } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required." });
      return;
    }

    const ai = getGeminiClient();

    // Clean formatting tags, markdown, and LaTeX so the neural voice reads smoothly and naturally
    const cleanText = text
      .replace(/\[\[KEY:\s*(.*?)]]/g, "$1")
      .replace(/\[\[WRONG:\s*(.*?)]]/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/[*#`_~]/g, "")
      .replace(/\\(text|mathbf|mathrm|ce)\{([^}]+)\}/g, "$2")
      .replace(/\$(.*?)\$/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .trim()
      .slice(0, 1500);

    const ttsResponse = await callGeminiWithFallback(ai, {
      model: "gemini-3.1-flash-tts-preview",
      contents: [
        {
          parts: [{ text: cleanText }],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Zephyr' (Expressive & natural), 'Kore' (Calm & academic), 'Puck' (Warm), 'Charon' (Deep), 'Fenrir' (Crisp)
            prebuiltVoiceConfig: { voiceName: voice || "Zephyr" },
          },
        },
      },
    });

    const part = ttsResponse.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || "audio/pcm;rate=24000";

    if (base64Audio) {
      res.json({
        audioData: base64Audio,
        mimeType,
      });
    } else {
      res.status(500).json({ error: "No audio stream returned from Gemini TTS." });
    }
  } catch (err: any) {
    console.error("Gemini TTS Error:", err);
    res.status(500).json({
      error: "Failed to generate Gemini voice.",
      details: err?.message || String(err),
    });
  }
});

// Main Chat Endpoint (Optimized with Quick-Fire ultra-fast mode & unrestricted in-depth masterclasses)
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, subject = "General", conversationHistory = [], quickFire = false } = req.body;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Prompt is required and must be a string." });
      return;
    }

    // Instant Sub-Millisecond Greetings & Casual Chit-chat
    const normalized = prompt.trim().toLowerCase().replace(/['"?!.,]/g, "").replace(/\s+/g, " ");
    const isGreeting =
      /^(hi|hey|hello|whats up|what is up|sup|how are you|good morning|good afternoon|good evening|who are you|namaste|hey guide|hello guide|hi guide)$/.test(
        normalized
      ) ||
      /^(hey|hello|hi)\s*(dr|doctor)?\s*(emyush|guide)?$/.test(normalized);

    if (isGreeting) {
      let mainAnswer = "Hey Dr Emyush Shrestha! I'm here and ready to help. What would you like to study or practice today?";
      if (normalized.includes("what is up") || normalized.includes("whats up") || normalized === "sup") {
        mainAnswer = "Hey Dr Emyush Shrestha! Everything is running smoothly and I'm ready for your questions. What science, math, or exam topic are we exploring today?";
      } else if (normalized.includes("how are you")) {
        mainAnswer = "I'm doing great, Dr Emyush Shrestha! All systems are primed to help you master your physics, chemistry, biology, or math topics. What shall we look into?";
      } else if (normalized.includes("who are you")) {
        mainAnswer = "I am GUIDE, your dedicated AI academic tutor and exam preparation assistant, designed specifically to support your studies.";
      }

      res.json({
        mainAnswer,
        isSimpleFact: true,
        isQuickFire: false,
        needsDiagrams: false,
        simplifiedAnswer: "",
        quickSummary: [],
        nebQuestions: [],
        ceeQuestions: [],
        followUps: [
          "Young's Double Slit Experiment",
          "Markovnikov vs Anti-Markovnikov Rule",
          "Cardiac Cycle & ECG Curves",
        ],
        diagrams: [],
      });
      return;
    }

    const ai = getGeminiClient();

    // ⚡ QUICK-FIRE MODE (Ultra-fast response for simple factual queries, bypassing schemas, diagrams, and exam generators)
    if (quickFire) {
      const response = await callGeminiWithFallback(ai, {
        model: "gemini-3.6-flash",
        contents: [
          ...conversationHistory.map((msg: any) => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.text || msg.response?.mainAnswer || "" }],
          })),
          {
            role: "user",
            parts: [
              {
                text: `Subject: ${subject}\nQuestion: ${prompt}\n\nTask: Deliver an immediate, direct, and crisp factual answer for Dr Emyush Shrestha. Be concise and precise.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: `You are GUIDE in "Quick-Fire Mode" for Dr Emyush Shrestha. Provide an immediate, direct, concise, and accurate answer to the user's factual query without conversational fluff. Use clear Markdown notation.`,
          temperature: 0.3,
        },
      });

      const fastAnswer = (response.text || "").trim();
      res.json({
        mainAnswer: fastAnswer,
        isSimpleFact: true,
        isQuickFire: true,
        needsDiagrams: false,
        simplifiedAnswer: "",
        quickSummary: [],
        nebQuestions: [],
        ceeQuestions: [],
        followUps: [],
        diagrams: [],
      });
      return;
    }

    // 📚 IN-DEPTH ACADEMIC MODE (Comprehensive, unrestricted detailed explanations with step-by-step masterclass depth)
    const systemInstruction = `You are "GUIDE", an elite, dedicated academic master tutor assisting Dr Emyush Shrestha.

CRITICAL ARCHITECTURAL DIRECTIVES:

1. MAIN ACADEMIC EXPLANATION ("mainAnswer") - UNRESTRICTED & EXHAUSTIVE:
   - Provide an IN-DEPTH, EXHAUSTIVE, UNRESTRICTED, and DETAILED explanation.
   - ABSOLUTELY DO NOT restrict, compress, or truncate the answer. It can be as long and as multi-paragraphed as necessary to achieve complete clarity.
   - Explain ALL mechanisms, sub-processes, phases (e.g. Initiation, Elongation, Termination), every specific enzyme/protein with its exact biochemical role, structural orientations (e.g. 5' to 3', replication forks, leading vs lagging strands, Okazaki fragments), chemical reaction pathways, electron shifts, physical derivations with full steps, mathematical proofs, and clinical/scientific significance.
   - Format with rich Markdown:
     * Use clear descriptive headings (e.g. "### 1. Initiation & Unwinding", "### 2. Primer Synthesis & Elongation", "### Key Enzymes Table / Summary").
     * Use bulleted steps, numbered sequences, and clean chemical/math notation.
   - Highlight key definitions/laws/formulas in BLUE using [[KEY: important definition or formula]].
   - Highlight common misconceptions/exam traps in RED using [[WRONG: common misconception]].

2. SIMPLIFIED EXPLANATION ("simplifiedAnswer"):
   - Provide EXACTLY ONE cohesive, intuitive paragraph using multiple everyday analogies and real-world examples in plain language (e.g., comparing parts to zippers, train cars, construction crews, or recipes).
   - Keep this to a single friendly paragraph for instant intuitive grasp.

3. QUICK SUMMARY ("quickSummary"):
   - 3 to 5 high-yield bullet takeaways.

4. EXAM PREPARATION:
   - "nebQuestions": 2 to 3 subjective NEB board examination questions with marks, step solutions, and key concepts.
   - "ceeQuestions": 2 to 3 CEE medical entrance MCQs with 4 options, correctIndex, thorough explanation, and high-yield mnemonic/trick note.

5. followUps: 2 to 3 natural, highly relevant follow-up questions Dr Emyush Shrestha might ask next.`;

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.6-flash",
      contents: [
        ...conversationHistory.map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text || msg.response?.mainAnswer || "" }],
        })),
        {
          role: "user",
          parts: [
            {
              text: `Subject Focus: ${subject}\nQuestion: ${prompt}\n\nPlease provide a fully detailed, unrestricted masterclass explanation in mainAnswer, a one-paragraph analogy in simplifiedAnswer, quick summary bullets, and NEB/CEE exam practice.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainAnswer: { type: Type.STRING, description: "Exhaustive, unrestricted, comprehensive academic explanation with all detailed steps, mechanisms, enzymes, and full paragraphs." },
            isSimpleFact: { type: Type.BOOLEAN, description: "True ONLY if question is pure 1-line trivia" },
            needsDiagrams: { type: Type.BOOLEAN, description: "True if the topic warrants visual scientific diagrams" },
            simplifiedAnswer: { type: Type.STRING, description: "Exactly one cohesive paragraph explaining the topic using various everyday analogies and real-world examples in plain language." },
            quickSummary: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key bullet points of the topic",
            },
            nebQuestions: {
              type: Type.ARRAY,
              description: "NEB exam subjective questions with complete solutions",
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  marks: { type: Type.STRING },
                  solution: { type: Type.STRING },
                  keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["question", "marks", "solution", "keyConcepts"],
              },
            },
            ceeQuestions: {
              type: Type.ARRAY,
              description: "CEE entrance exam MCQs with explanations and trick notes",
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  trickNote: { type: Type.STRING },
                },
                required: ["question", "options", "correctIndex", "explanation", "trickNote"],
              },
            },
            followUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 logical follow-up questions",
            },
          },
          required: ["mainAnswer", "simplifiedAnswer", "quickSummary", "nebQuestions", "ceeQuestions", "followUps"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = cleanAndParseJSON(jsonText);

    // Normalize defaults
    data.isSimpleFact = Boolean(data.isSimpleFact && (!data.nebQuestions || data.nebQuestions.length === 0));
    data.isQuickFire = false;
    data.needsDiagrams = data.needsDiagrams !== undefined ? Boolean(data.needsDiagrams) : true;
    data.simplifiedAnswer = sanitizeSimplifiedAnswer(data.simplifiedAnswer || "");
    data.quickSummary = Array.isArray(data.quickSummary) ? data.quickSummary : [];
    data.nebQuestions = Array.isArray(data.nebQuestions) ? data.nebQuestions : [];
    data.ceeQuestions = Array.isArray(data.ceeQuestions) ? data.ceeQuestions : [];
    data.followUps = Array.isArray(data.followUps) ? data.followUps : [];
    data.diagrams = [];

    // Ensure CEE IDs
    if (Array.isArray(data.ceeQuestions)) {
      data.ceeQuestions = data.ceeQuestions.map((q: any, idx: number) => ({
        ...q,
        id: `cee-${Date.now()}-${idx}`,
      }));
    }

    res.json(data);
  } catch (err: any) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({
      error: "Failed to generate AI response.",
      details: err?.message || String(err),
    });
  }
});

// Helper to find authentic educational scientific diagram pictures from Wikimedia Commons and Wikipedia
async function fetchEducationalImage(query: string): Promise<{ imageUrl?: string; sourceUrl?: string; sourceLabel?: string } | null> {
  try {
    const encoded = encodeURIComponent(query);
    // Search Wikimedia Commons
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encoded}&gsrlimit=3&prop=imageinfo&iiprop=url|size|mime&origin=*`;
    const res = await fetch(commonsUrl, { headers: { "User-Agent": "GUIDE-Academic-App/1.0" } });
    if (res.ok) {
      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        const validPages = Object.values(pages) as any[];
        for (const p of validPages) {
          const info = p.imageinfo?.[0];
          if (
            info?.url &&
            (info.mime?.startsWith("image/png") ||
              info.mime?.startsWith("image/jpeg") ||
              info.mime?.startsWith("image/svg") ||
              info.mime?.startsWith("image/webp"))
          ) {
            return {
              imageUrl: info.url,
              sourceUrl: info.descriptionurl || info.url,
              sourceLabel: "Wikimedia Scientific Archive / Google Images Index",
            };
          }
        }
      }
    }

    // Secondary fallback search Wikipedia
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original|thumbnail&pithumbsize=800&generator=search&gsrsearch=${encoded}&gsrlimit=2&origin=*`;
    const wikiRes = await fetch(wikiUrl, { headers: { "User-Agent": "GUIDE-Academic-App/1.0" } });
    if (wikiRes.ok) {
      const data = await wikiRes.json();
      const pages = data?.query?.pages;
      if (pages) {
        const validPages = Object.values(pages) as any[];
        for (const p of validPages) {
          const img = p.original?.source || p.thumbnail?.source;
          if (img) {
            return {
              imageUrl: img,
              sourceUrl: `https://en.wikipedia.org/?curid=${p.pageid}`,
              sourceLabel: "Wikipedia Academic Commons",
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn("Educational image fetch error:", e);
  }
  return null;
}

// Asynchronous Diagram Generation Endpoint (Returns real picture diagrams & Google image links)
app.post("/api/generate-diagrams", async (req, res) => {
  try {
    const { prompt, mainAnswer = "", subject = "General" } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Prompt is required." });
      return;
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are a specialist scientific diagram curator and visual educator.
Given a topic/question and its explanation, create 1 to 3 distinct educational diagram specifications IF the concept is visual/scientific (e.g. physics optics, anatomy, chemical structures, cell biology, geometry).
If the question is trivial non-visual trivia (e.g. a simple single date or factual name with no diagram needed), you may return an empty diagrams array.
For each visual diagram:
1. title: Clear academic title of the diagram/picture (e.g. "Ray Optics Convex Lens Refraction Diagram", "Cardiac Cycle & ECG Pressure Curves", "Markovnikov Addition Reaction Mechanism").
2. description: Detailed explanation of what the diagram/picture shows.
3. searchQuery: Specific search term to find high-resolution pictures and diagrams on Google and scientific archives (e.g. "convex lens focal point refraction diagram", "cardiac cycle Wiggers diagram ECG", "electrophilic addition mechanism carbocation").
4. keyPoints: 3 to 4 key visual pointers, labels, or takeaways shown in the picture.
5. svg: High-quality, clean vector SVG graphic fallback for the diagram (viewBox="0 0 600 400" with clear labels and colors).`;

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Subject: ${subject}\nQuestion: ${prompt}\n\nKey Concepts Summary:\n${mainAnswer.slice(0, 800)}\n\nGenerate visual diagrams with search queries and SVG fallbacks if visually relevant.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagrams: {
              type: Type.ARRAY,
              description: "2 to 3 complete visual diagrams",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  searchQuery: { type: Type.STRING, description: "Precise search query for picture diagrams" },
                  svg: { type: Type.STRING, description: "Complete inline SVG code fallback" },
                  keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["title", "description", "searchQuery", "svg", "keyPoints"],
              },
            },
          },
          required: ["diagrams"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = cleanAndParseJSON(jsonText);

    let rawDiagrams = Array.isArray(data.diagrams) ? data.diagrams : [];
    
    // Concurrently fetch real pictures for each diagram query
    const diagrams = await Promise.all(
      rawDiagrams.map(async (d: any, idx: number) => {
        const query = d.searchQuery || `${d.title} diagram science`;
        const imageResult = await fetchEducationalImage(query);
        const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;

        return {
          id: `diag-${Date.now()}-${idx}`,
          title: d.title || `Diagram ${idx + 1}`,
          description: d.description || "Visual Diagram and Schematic",
          imageUrl: imageResult?.imageUrl || undefined,
          sourceUrl: imageResult?.sourceUrl || undefined,
          sourceLabel: imageResult?.sourceLabel || "Google Images & Academic Archives",
          googleSearchUrl,
          svg: sanitizeSVG(d.svg, d.title || `Diagram ${idx + 1}`),
          keyPoints: Array.isArray(d.keyPoints) ? d.keyPoints : [],
        };
      })
    );

    res.json({ diagrams });
  } catch (err: any) {
    console.error("Error generating diagrams:", err);
    res.status(500).json({ error: "Failed to generate diagrams.", details: err?.message });
  }
});

// Dedicated Speech Auto-Correction Endpoint (Fixes voice recognition errors using Gemini)
app.post("/api/fix-speech", async (req, res) => {
  try {
    const { rawTranscript, subject = "General" } = req.body;
    if (!rawTranscript || typeof rawTranscript !== "string") {
      res.status(400).json({ error: "rawTranscript string is required." });
      return;
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are "GUIDE Voice Auto-Corrector", an intelligent academic voice dictation assistant for Dr Emyush Shrestha.
Your job is to take raw, messy speech-to-text voice transcriptions and fix all voice-recognition errors, phonetic mishearings, chemical formulas, mathematical terms, stuttering, and filler words.

EXAMPLES:
- "what is geminal vessel halide" -> "What is the structural difference between Geminal Dihalide and Vicinal Dihalide?"
- "explain H two O water structure" -> "Explain the molecular structure and hydrogen bonding of H₂O."
- "tell me about neb exam questions for physics derivatives" -> "What are the high-yield NEB exam questions for Physics derivatives?"
- "how does photosynthesise work in plant cell um" -> "How does photosynthesis work in plant cells?"

RULES:
- Keep Dr Emyush Shrestha's intent intact.
- Fix chemical notation (H₂O, CH₃COOH, NaCl), mathematical notation, and scientific terms.
- Clean up filler words (um, ah, like, you know) and speech glitches.
- Return JSON with "correctedText" and an array of "changesMade" (short 1-2 word descriptions of what was fixed).`;

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.6-flash",
      contents: `Subject Focus: ${subject}\nRaw Spoken Voice Transcript: "${rawTranscript}"`,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedText: { type: Type.STRING, description: "Pristine, fixed query string" },
            changesMade: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Short list of corrections applied",
            },
          },
          required: ["correctedText", "changesMade"],
        },
      },
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    res.json({
      correctedText: parsed.correctedText || rawTranscript,
      changesMade: parsed.changesMade || [],
      originalText: rawTranscript,
    });
  } catch (err: any) {
    console.error("Error in /api/fix-speech:", err);
    // Gracefully fallback to raw transcript if AI fix fails
    res.json({
      correctedText: req.body.rawTranscript || "",
      changesMade: [],
      originalText: req.body.rawTranscript || "",
    });
  }
});

// Single topic simplified endpoint
app.post("/api/simplify", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text is required." });
      return;
    }
    const ai = getGeminiClient();
    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.6-flash",
      contents: `Explain the following topic in EXACTLY ONE cohesive, intuitive paragraph using multiple everyday analogies and real-world examples in plain language:\n\n${text}`,
    });
    res.json({ simplifiedText: sanitizeSimplifiedAnswer(response.text) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to simplify." });
  }
});

// Dedicated Exam Generator Endpoint (Generates a full NEB & CEE quiz set for any user-entered subject/topic)
app.post("/api/exam-set", async (req, res) => {
  try {
    const { topic, subject } = req.body;
    if (!topic) {
      res.status(400).json({ error: "Topic is required." });
      return;
    }

    const ai = getGeminiClient();
    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.6-flash",
      contents: `Generate a comprehensive NEB & CEE practice test set for Topic: "${topic}" in Subject: "${subject || "General Science"}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subject: { type: Type.STRING },
            topicSummary: { type: Type.STRING },
            nebQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  marks: { type: Type.STRING },
                  solution: { type: Type.STRING },
                  keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["question", "marks", "solution", "keyConcepts"],
              },
            },
            ceeQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  trickNote: { type: Type.STRING },
                },
                required: ["question", "options", "correctIndex", "explanation", "trickNote"],
              },
            },
          },
          required: ["title", "subject", "topicSummary", "nebQuestions", "ceeQuestions"],
        },
      },
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    if (Array.isArray(parsed.ceeQuestions)) {
      parsed.ceeQuestions = parsed.ceeQuestions.map((q: any, idx: number) => ({
        ...q,
        id: `exam-cee-${Date.now()}-${idx}`,
      }));
    }
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate exam set." });
  }
});

// Explicit 404 handler for any unmatched /api/* route (never return HTML)
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found.` });
});

// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled server error:", err);
  if (req.path.startsWith("/api")) {
    res.status(500).json({
      error: "Internal server error.",
      details: err?.message || String(err),
    });
  } else {
    next(err);
  }
});

// Vite Development or Production Static Serving
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
