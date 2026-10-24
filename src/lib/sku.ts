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

  // Query all SKUs for the current user with this prefix, then find the max number.
  // This prevents duplicates even if items were deleted.
  const { data, error } = await supabase
    .from("clothing_items")
    .select("sku")
    .not("sku", "is", null)
    .ilike("sku", `${prefix}-%`);

  if (error) {
    // Fallback: use count
    const { count } = await supabase
      .from("clothing_items")
      .select("id", { count: "exact", head: true });
    return `${prefix}-${(count || 0) + 1}`;
  }

  let maxNumber = 0;
  for (const row of data || []) {
    const sku = row.sku as string | null;
    if (!sku) continue;
    const match = sku.match(/^.+-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }

  return `${prefix}-${maxNumber + 1}`;
}
