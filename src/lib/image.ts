import { supabase } from "./supabase";

const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const QUALITY = 0.75;

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > height && width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas non disponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Image invalide"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Lecture du fichier échouée"));
    reader.readAsDataURL(file);
  });
}

export async function uploadPhoto(
  file: File,
  itemId: string,
  index: number
): Promise<string> {
  const compressed = await compressImage(file);
  const blob = dataUrlToBlob(compressed);
  const ext = "jpg";
  const path = `${itemId}/${index}.${ext}`;

  const { error } = await supabase.storage
    .from("clothing-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("clothing-photos")
    .getPublicUrl(path);

  return data.publicUrl;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8], { type: mime });
}
