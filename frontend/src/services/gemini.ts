import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const summarizeRecord = async (recordContent: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a medical assistant. Summarize the following medical record content into 2 sentences for a quick doctor review. Content: ${recordContent}`,
    });
    return response.text || "Summary not available.";
  } catch (error) {
    console.error("AI Error", error);
    return "AI Summary unavailable.";
  }
};

export const explainToPatient = async (medicalTerm: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explain the medical term "${medicalTerm}" in simple, non-medical language for a patient. Keep it under 50 words.`,
    });
    return response.text || "Explanation not available.";
  } catch (error) {
    console.error("AI Error", error);
    return "AI Explanation unavailable.";
  }
};

export const generateRecordTitle = async (description: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, professional 3-5 word title for a medical record based on this description: "${description}". Do not use quotes.`,
    });
    return response.text || "Medical Record";
  } catch (error) {
    console.error("AI Error", error);
    return "New Record Upload";
  }
};