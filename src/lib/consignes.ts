const CONSIGNES_KEY = "stylestock_consignes";

export function getConsignes(): string {
  return localStorage.getItem(CONSIGNES_KEY) || "";
}

export function setConsignes(text: string): void {
  localStorage.setItem(CONSIGNES_KEY, text);
}
