import { useState } from "react";
import { Key, Check, Trash2, ExternalLink, Info } from "lucide-react";
import { getGeminiKey, setGeminiKey, clearGeminiKey } from "@/lib/ai";
import { supabase } from "@/lib/supabase";

export function Settings() {
  const [key, setKey] = useState(getGeminiKey() || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (key.trim()) {
      setGeminiKey(key.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClear = () => {
    clearGeminiKey();
    setKey("");
  };

  const hasKey = !!getGeminiKey();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-xl font-bold text-stone-800 mb-2">Paramètres</h2>
      <p className="text-sm text-stone-500 mb-8">
        Configuration de l'IA pour la génération d'annonces.
      </p>

      {/* Gemini API Key */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Key className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">Clé API Gemini</h3>
            <p className="text-sm text-stone-500">
              Requise pour analyser les photos avec l'IA
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Comment obtenir une clé gratuite</p>
              <ol className="list-decimal list-inside mt-1 space-y-0.5 text-blue-700">
                <li>
                  Allez sur{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-0.5"
                  >
                    Google AI Studio
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Connectez-vous avec un compte Google</li>
                <li>Cliquez sur « Create API Key »</li>
                <li>Copiez la clé et collez-la ci-dessous</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            <strong>À savoir :</strong> L'offre gratuite de Gemini a des quotas
            limités (environ 15 requêtes/minute sur le plan gratuit). Pour un
            usage intensif, un plan payant peut être nécessaire. La clé est
            stockée localement sur votre appareil et transmise de façon
            sécurisée au serveur pour chaque analyse.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Votre clé API Gemini
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza..."
            className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Enregistré !
              </>
            ) : (
              "Enregistrer la clé"
            )}
          </button>
          {hasKey && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          )}
        </div>

        {hasKey && (
          <p className="text-sm text-emerald-600 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Clé API configurée et prête à l'emploi.
          </p>
        )}
      </div>

      {/* Import/Export */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 mt-6 space-y-4">
        <h3 className="font-semibold text-stone-800">Sauvegarde du stock</h3>
        <p className="text-sm text-stone-500">
          Exportez régulièrement votre stock pour éviter toute perte de
          données. Vous pouvez le réimporter en cas de besoin.
        </p>
        <ImportExport />
      </div>
    </div>
  );
}

function ImportExport() {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleImport = async (file: File) => {
    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const items = JSON.parse(text);
      if (!Array.isArray(items)) throw new Error("Format invalide");

      const { error } = await supabase.from("clothing_items").insert(
        items.map((item: Record<string, unknown>) => ({
          title: item.title,
          brand: item.brand,
          category: item.category,
          model: item.model,
          size: item.size,
          color: item.color,
          material: item.material,
          condition: item.condition,
          defects: item.defects,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          hashtags: item.hashtags || [],
          description: item.description,
          vinted_title: item.vinted_title,
          status: item.status || "a_verifier",
          photos: item.photos || [],
          ai_confidence: item.ai_confidence,
          ai_notes: item.ai_notes,
          sku: item.sku,
          consignes: item.consignes,
        }))
      );

      if (error) throw error;
      setMessage(`${items.length} vêtements importés avec succès.`);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : "Erreur lors de l'import."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
        }}
        className="hidden"
        id="import-input"
      />
      <label
        htmlFor="import-input"
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-600 cursor-pointer"
      >
        {importing ? "Import en cours..." : "Importer un fichier JSON"}
      </label>
      {message && (
        <p
          className={`text-sm ${
            message.startsWith("Erreur")
              ? "text-red-600"
              : "text-emerald-600"
          }`}
        >
          {message}
        </p>
      )}
      <p className="text-xs text-stone-400">
        L'import ajoute les vêtements au stock existant sans remplacer les
        données actuelles.
      </p>
    </div>
  );
}
