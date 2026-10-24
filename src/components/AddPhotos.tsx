import { useState, useCallback } from "react";
import { Upload, X, ImageIcon, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { compressImage, dataUrlToBlob } from "@/lib/image";
import { generateListing, getGeminiKey } from "@/lib/ai";
import { supabase } from "@/lib/supabase";
import { generateSku } from "@/lib/sku";
import { useAuth } from "@/lib/auth";
import type { AIAnalysisResult, ClothingItem } from "@/types";
import { ListingEditor } from "./ListingEditor";

const MAX_PHOTOS = 6;

interface AddPhotosProps {
  onSaved: () => void;
}

type Phase = "upload" | "analyzing" | "result";

export function AddPhotos({ onSaved }: AddPhotosProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("upload");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [sku, setSku] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos par vêtement.`);
      return;
    }

    const allImageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const fileArray = allImageFiles.slice(0, remaining);

    if (allImageFiles.length > remaining) {
      setError(`Maximum ${MAX_PHOTOS} photos par vêtement. Seules les ${fileArray.length} premières ont été ajoutées.`);
    }

    const compressed: string[] = [];
    for (const file of fileArray) {
      try {
        const dataUrl = await compressImage(file);
        compressed.push(dataUrl);
      } catch {
        setError("Une ou plusieurs images n'ont pas pu être traitées.");
      }
    }
    setPhotos((prev) => [...prev, ...compressed]);
  }, [photos.length]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleGenerate = async () => {
    if (photos.length === 0) return;
    setPhase("analyzing");
    setError(null);

    try {
      const key = getGeminiKey();
      const aiResult = await generateListing(photos, key);
      setResult(aiResult);
      const generatedSku = await generateSku(aiResult.brand);
      setSku(generatedSku);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setPhase("upload");
    }
  };

  const handleSave = async (editedData: Partial<ClothingItem>): Promise<void> => {
    const newItem = {
      title: editedData.vinted_title || result?.vinted_title || null,
      brand: editedData.brand ?? result?.brand ?? null,
      category: editedData.category ?? result?.category ?? null,
      model: editedData.model ?? result?.model ?? null,
      size: editedData.size ?? result?.size ?? null,
      color: editedData.color ?? result?.color ?? null,
      material: editedData.material ?? result?.material ?? null,
      condition: editedData.condition ?? result?.condition ?? null,
      defects: editedData.defects ?? result?.defects ?? null,
      purchase_price: editedData.purchase_price ?? null,
      selling_price: editedData.selling_price ?? result?.suggested_price ?? null,
      hashtags: editedData.hashtags ?? result?.hashtags ?? [],
      description: editedData.description ?? result?.description ?? null,
      vinted_title: editedData.vinted_title ?? result?.vinted_title ?? null,
      status: "annonce_prete",
      ai_confidence: result?.confidence ?? null,
      ai_notes: result?.notes ?? null,
      sku: editedData.sku ?? sku,
      consignes: editedData.consignes ?? null,
    };

    const { data, error: insertError } = await supabase
      .from("clothing_items")
      .insert(newItem)
      .select()
      .single();

    if (insertError) throw insertError;

    if (data && photos.length > 0 && user) {
      const photoPaths: string[] = [];
      const uploadErrors: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        try {
          const blob = dataUrlToBlob(photos[i]);
          const path = `${user.id}/${data.id}/${i}.jpg`;
          const { error: upErr } = await supabase.storage
            .from("clothing-photos")
            .upload(path, blob, { contentType: "image/jpeg", upsert: true });

          if (upErr) {
            uploadErrors.push(`Photo ${i + 1}: ${upErr.message}`);
          } else {
            photoPaths.push(path);
          }
        } catch (e) {
          uploadErrors.push(
            `Photo ${i + 1}: ${e instanceof Error ? e.message : "erreur inconnue"}`
          );
        }
      }

      if (photoPaths.length > 0) {
        const { error: updateErr } = await supabase
          .from("clothing_items")
          .update({ photos: photoPaths })
          .eq("id", data.id);

        if (updateErr) {
          throw new Error(
            `Vêtement enregistré mais erreur lors de la sauvegarde des photos: ${updateErr.message}`
          );
        }
      }

      if (uploadErrors.length > 0) {
        if (photoPaths.length === 0) {
          throw new Error(
            `Aucune photo n'a pu être sauvegardée. Le vêtement est enregistré sans photos. Erreurs: ${uploadErrors.join(", ")}`
          );
        } else {
          throw new Error(
            `Vêtement enregistré avec ${photoPaths.length}/${photos.length} photos. Erreurs: ${uploadErrors.join(", ")}`
          );
        }
      }
    }

    resetState();
    onSaved();
  };

  const resetState = () => {
    setPhotos([]);
    setResult(null);
    setSku("");
    setError(null);
    setPhase("upload");
  };

  if (phase === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary-500 animate-pulse-subtle" />
          </div>
        </div>
        <h3 className="mt-6 text-lg font-semibold text-stone-800">
          Analyse en cours...
        </h3>
        <p className="mt-2 text-sm text-stone-500 max-w-sm text-center">
          L'IA examine vos photos pour identifier le vêtement, estimer son état
          et générer l'annonce. Cela peut prendre quelques secondes.
        </p>
        <Loader2 className="mt-4 w-5 h-5 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <ListingEditor
        result={result}
        photos={photos}
        sku={sku}
        onSave={handleSave}
        onCancel={resetState}
        onNext={resetState}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          dragActive
            ? "border-primary-400 bg-primary-50"
            : "border-stone-300 bg-white hover:border-stone-400"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="photo-input"
        />
        <label htmlFor="photo-input" className="cursor-pointer block">
          <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 flex items-center justify-center">
            <Upload className="w-8 h-8 text-stone-400" />
          </div>
          <p className="mt-4 font-medium text-stone-700">
            Déposez vos photos ici
          </p>
          <p className="mt-1 text-sm text-stone-400">
            ou cliquez pour parcourir — jusqu'à {MAX_PHOTOS} photos
          </p>
        </label>
      </div>

      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-6">
            {photos.map((photo, i) => (
              <div
                key={i}
                className="relative group aspect-square rounded-xl overflow-hidden bg-stone-100 animate-slide-in"
              >
                <img
                  src={photo}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="absolute bottom-1 left-1 text-xs text-white bg-black/40 px-1.5 rounded">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-stone-500">
              {photos.length} photo{photos.length > 1 ? "s" : ""} prête
              {photos.length > 1 ? "s" : ""}
              {photos.length < MAX_PHOTOS && (
                <span className="text-stone-400">
                  {" "}
                  · {MAX_PHOTOS - photos.length} restante{MAX_PHOTOS - photos.length > 1 ? "s" : ""}
                </span>
              )}
            </p>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Sparkles className="w-5 h-5" />
              Générer l'annonce
            </button>
          </div>
        </>
      )}

      {photos.length === 0 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-stone-400">
          <ImageIcon className="w-4 h-4" />
          <span>Astuce : 3 à 6 photos donnent les meilleurs résultats</span>
        </div>
      )}

      {error && photos.length === 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
