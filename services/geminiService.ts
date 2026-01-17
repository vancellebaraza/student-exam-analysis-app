
import { GoogleGenAI, Type } from "@google/genai";
import { StudyNotes } from "../types";

export async function generateStudyNotes(content: string): Promise<StudyNotes> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: content,
    config: {
      systemInstruction: `You are an intelligent academic study assistant. Transform the provided content into structured study notes.

STRICT PEDAGOGICAL RULES:
- Explain concepts as if teaching a student for the first time.
- Use clear, simple, and precise language. Avoid unnecessary jargon.
- Define technical terms clearly.
- Keep explanations accurate and aligned with standard academic understanding.

STRUCTURE REQUIREMENTS (JSON):
1. topicOverview: Brief explanation of the topic and its importance.
2. detailedExplanation: Step-by-step breakdown using simple sentences.
3. keyPoints: List of essential definitions, facts, and processes.
4. examples: Realistic everyday or academic examples.
5. commonMistakes: Misunderstandings and their corrections.
6. examTips: Focus areas for examiners and keywords.
7. studyQuestions: 
   - 3 multiple choice questions (question, options, answer).
   - 3 short answer questions (question, answer).
   - 1 exam-style question with a detailed model answer.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topicOverview: { type: Type.STRING },
          detailedExplanation: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          examples: { type: Type.ARRAY, items: { type: Type.STRING } },
          commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
          examTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          studyQuestions: {
            type: Type.OBJECT,
            properties: {
              mcqs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING }
                  },
                  required: ["question", "options", "answer"]
                }
              },
              shortAnswers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING }
                  },
                  required: ["question", "answer"]
                }
              },
              examStyle: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  modelAnswer: { type: Type.STRING }
                },
                required: ["question", "modelAnswer"]
              }
            },
            required: ["mcqs", "shortAnswers", "examStyle"]
          }
        },
        required: ["topicOverview", "detailedExplanation", "keyPoints", "examples", "commonMistakes", "examTips", "studyQuestions"]
      }
    }
  });

  try {
    const result = JSON.parse(response.text);
    return result as StudyNotes;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    throw new Error("I had trouble structuring those notes. Please try pasting shorter content or checking the text quality.");
  }
}
