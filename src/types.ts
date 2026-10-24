export type ClothingStatus = "a_verifier" | "annonce_prete" | "en_ligne" | "vendu";

export interface ClothingItem {
  id: string;
  user_id: string;
  title: string | null;
  brand: string | null;
  category: string | null;
  model: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  condition: string | null;
  defects: string | null;
  purchase_price: number | null;
  selling_price: number | null;
  hashtags: string[];
  description: string | null;
  vinted_title: string | null;
  status: ClothingStatus;
  photos: string[];
  ai_confidence: string | null;
  ai_notes: string | null;
  sku: string | null;
  consignes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysisResult {
  brand: string | null;
  category: string | null;
  model: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  condition: string | null;
  defects: string | null;
  vinted_title: string;
  description: string;
  hashtags: string[];
  suggested_price: number | null;
  confidence: "bas" | "moyen" | "eleve";
  notes: string;
}

export const STATUS_LABELS: Record<ClothingStatus, string> = {
  a_verifier: "À vérifier",
  annonce_prete: "Annonce prête",
  en_ligne: "En ligne",
  vendu: "Vendu",
};

export const STATUS_COLORS: Record<ClothingStatus, string> = {
  a_verifier: "bg-amber-100 text-amber-700 border-amber-200",
  annonce_prete: "bg-blue-100 text-blue-700 border-blue-200",
  en_ligne: "bg-emerald-100 text-emerald-700 border-emerald-200",
  vendu: "bg-gray-100 text-gray-500 border-gray-200",
};

export const CONFIDENCE_LABELS: Record<string, string> = {
  bas: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
};
