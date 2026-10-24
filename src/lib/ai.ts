import type { AIAnalysisResult } from "@/types";
import { supabase } from "./supabase";

function validateAiResult(raw: unknown): AIAnalysisResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Réponse de l'IA invalide.");
  }
  const obj = raw as Record<string, unknown>;

  const strOrNull = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && !isNaN(v) ? v : null;

  const hashtags: string[] = Array.isArray(obj.hashtags)
    ? obj.hashtags.filter(
        (h): h is string => typeof h === "string" && h.trim().length > 0
      )
    : [];

  const confidence = obj.confidence;
  const validConfidence =
    confidence === "bas" || confidence === "moyen" || confidence === "eleve"
      ? confidence
      : "bas";

  const vintedTitle =
    typeof obj.vinted_title === "string" && obj.vinted_title.trim()
      ? obj.vinted_title.trim()
      : "Vêtement seconde main";

  const description =
    typeof obj.description === "string" ? obj.description.trim() : "";

  return {
    brand: strOrNull(obj.brand),
    category: strOrNull(obj.category),
    model: strOrNull(obj.model),
    size: strOrNull(obj.size),
    color: strOrNull(obj.color),
    material: strOrNull(obj.material),
    condition: strOrNull(obj.condition),
    defects: strOrNull(obj.defects),
    vinted_title: vintedTitle,
    description,
    hashtags,
    suggested_price: numOrNull(obj.suggested_price),
    confidence: validConfidence,
    notes: typeof obj.notes === "string" ? obj.notes : "",
  };
}

export async function generateListing(
  photos: string[],
  geminiKey: string | null
): Promise<AIAnalysisResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error("Vous devez être connecté pour générer une annonce.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (geminiKey) {
    headers["X-Gemini-Key"] = geminiKey;
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-listing`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ photos }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `Erreur lors de la génération (${response.status})`
    );
  }

  const data = await response.json();
  return validateAiResult(data);
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
