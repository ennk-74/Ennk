import { supabase } from "./supabase";

const BRAND_PREFIXES: Record<string, string> = {
  "lacoste": "LAC",
  "ralph lauren": "RL",
  "polo ralph lauren": "RL",
  "ralph": "RL",
  "tommy hilfiger": "TH",
  "calvin klein": "CK",
  "nike": "NK",
  "adidas": "ADI",
  "zara": "ZAR",
  "h&m": "HM",
  "sephora": "SEP",
  "levis": "LEV",
  "gap": "GAP",
  "puma": "PUM",
  "new balance": "NB",
  "the north face": "TNF",
  "superdry": "SUP",
  "gucci": "GUC",
  "michael kors": "MK",
  "guess": "GUE",
  "vans": "VAN",
  "converse": "CON",
  "dr martens": "DRM",
  "napapijri": "NAP",
  "kappa": "KAP",
  "fila": "FIL",
  "champion": "CHA",
  "desigual": "DES",
  "columbia": "COL",
  "patagonia": "PAT",
};

function normalizeBrand(brand: string): string {
  return brand
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getBrandPrefix(brand: string | null): string {
  if (!brand) return "SKU";
  const normalized = normalizeBrand(brand);
  if (BRAND_PREFIXES[normalized]) return BRAND_PREFIXES[normalized];
  const words = normalized.split(/[\s-]+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export async function generateSku(brand: string | null): Promise<string> {
  const prefix = getBrandPrefix(brand);

  let count = 0;
  if (brand) {
    const { count: exactCount } = await supabase
      .from("clothing_items")
      .select("id", { count: "exact", head: true })
      .ilike("brand", brand);
    count = exactCount || 0;
  }

  const number = count + 1;
  return `${prefix}-${number}`;
}
