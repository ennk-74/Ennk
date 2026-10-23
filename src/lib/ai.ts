import type { AIAnalysisResult } from "@/types";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-listing`;

export async function generateListing(
  photos: string[],
  geminiKey: string | null
): Promise<AIAnalysisResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };

  if (geminiKey) {
    headers["X-Gemini-Key"] = geminiKey;
  }

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ photos }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.error || `Erreur lors de la génération (${response.status})`
    );
  }

  const data = await response.json();
  return data as AIAnalysisResult;
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
