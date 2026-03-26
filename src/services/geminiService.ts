import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "../types";

const getApiKey = () => {
  // @ts-ignore
  const key = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
  return key === "undefined" || !key ? "" : key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function processReceipt(base64Image: string, mimeType: string): Promise<ReceiptData> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Act as a financial data analyst. I will provide you with an image of a receipt. 
  Your job is to extract the Merchant Name, the Total Amount as a float, and the Category. 
  Choose the Category only from this list: [Groceries, Dining, Utilities, Transport, Health, Shopping, Entertainment, Misc]. 
  Also extract the date of the transaction in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ) if available, otherwise use today's date in that format.
  Return the result strictly in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          merchant: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          date: { type: Type.STRING },
        },
        required: ["merchant", "amount", "category", "date"],
      },
    },
  });

  const jsonStr = response.text.trim();
  return JSON.parse(jsonStr) as ReceiptData;
}
