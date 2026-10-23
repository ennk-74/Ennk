import type { AIAnalysisResult } from "@/types";

export async function generateListing(
  photos: string[],
  geminiKey: string | null
): Promise<AIAnalysisResult> {
  const apiKey = geminiKey || import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Clé API Gemini manquante. Ajoute ta clé dans les Paramètres.");
  }

  // Préparation des images au format Gemini API
  const imageParts = photos.map((photo) => {
    const base64Data = photo.includes(",") ? photo.split(",")[1] : photo;
    const mimeType = photo.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    return {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };
  });

  const prompt = `
    Analyse ces images de vêtement pour une fiche Vinted/Resell.
    Réponds EXCLUSIVEMENT sous la forme d'un objet JSON valide respectant cette structure exacte :
    {
      "title": "Titre Vinted optimisé (marque, type, taille, état)",
      "description": "Description détaillée et attrayante comprenant les détails, les mesures si visibles et l'état.",
      "brand": "Nom de la marque",
      "category": "Catégorie du vêtement (ex: Jeans, T-shirt, Sweats...)",
      "size": "Taille identifiée",
      "color": "Couleur principale",
      "condition": "Très bon état",
      "suggestedPrice": 25,
      "estimatedProfit": 20,
      "tags": ["#vintage", "#streetwear", "#levis"]
    }
  `;

  // Utilisation de l'API v1 au lieu de v1beta
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [...imageParts, { text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Erreur lors de la génération (${response.status})`
    );
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error("Aucune réponse générée par Gemini.");
  }

  return JSON.parse(textResponse) as AIAnalysisResult;
}

export function getGeminiKey(): string | null {
  return localStorage.getItem("gemini_api_key");
}

export function setGeminiKey(key: string): void {
  localStorage.setItem("gemini_api_key", key);
}

export function clearGeminiKey(): void {
  localStorage.removeItem("gemini_api_key");
}
