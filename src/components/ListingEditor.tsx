import { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Save,
  X,
  RotateCcw,
  AlertTriangle,
  Tag,
  Euro,
  Info,
  FileText,
  Hash,
} from "lucide-react";
import type { AIAnalysisResult, ClothingItem } from "@/types";
import { CONFIDENCE_LABELS } from "@/types";
import { getConsignes } from "@/lib/consignes";

interface ListingEditorProps {
  result: AIAnalysisResult;
  photos: string[];
  sku: string;
  onSave: (data: Partial<ClothingItem>) => Promise<void>;
  onCancel: () => void;
  onNext: () => void;
}

type Tab = "details" | "description";

export function ListingEditor({
  result,
  photos,
  sku,
  onSave,
  onCancel,
  onNext,
}: ListingEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [edited, setEdited] = useState({
    brand: result.brand || "",
    category: result.category || "",
    model: result.model || "",
    size: result.size || "",
    color: result.color || "",
    material: result.material || "",
    condition: result.condition || "",
    defects: result.defects || "",
    vinted_title: sku ? `[${sku}] ${result.vinted_title || ""}` : (result.vinted_title || ""),
    description: result.description || "",
    hashtags: result.hashtags.join(", "),
    selling_price: result.suggested_price?.toString() || "",
    purchase_price: "",
    consignes: getConsignes(),
  });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMode, setSavedMode] = useState(false);

  useEffect(() => {
    setEdited({
      brand: result.brand || "",
      category: result.category || "",
      model: result.model || "",
      size: result.size || "",
      color: result.color || "",
      material: result.material || "",
      condition: result.condition || "",
      defects: result.defects || "",
      vinted_title: sku ? `[${sku}] ${result.vinted_title || ""}` : (result.vinted_title || ""),
      description: result.description || "",
      hashtags: result.hashtags.join(", "),
      selling_price: result.suggested_price?.toString() || "",
      purchase_price: "",
      consignes: getConsignes(),
    });
  }, [result, sku]);

  const fullListing = buildListingText(edited, sku);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullListing);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        brand: edited.brand || null,
        category: edited.category || null,
        model: edited.model || null,
        size: edited.size || null,
        color: edited.color || null,
        material: edited.material || null,
        condition: edited.condition || null,
        defects: edited.defects || null,
        vinted_title: edited.vinted_title || null,
        description: edited.description || null,
        hashtags: edited.hashtags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        selling_price: edited.selling_price ? parseFloat(edited.selling_price) : null,
        purchase_price: edited.purchase_price
          ? parseFloat(edited.purchase_price)
          : null,
        consignes: edited.consignes || null,
        sku,
      });
      setSavedMode(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement."
      );
    } finally {
      setSaving(false);
    }
  };

  if (savedMode) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-stone-800">
          Vêtement enregistré !
        </h3>
        <p className="mt-2 text-stone-500">
          Réf. {sku} — La fiche a été ajoutée à votre stock avec les photos.
        </p>
        <button
          onClick={onNext}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          <RotateCcw className="w-5 h-5" />
          Passer au suivant
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Détails", icon: <Tag className="w-4 h-4" /> },
    { id: "description", label: "Description", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-800">
            Annonce générée par l'IA
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Vérifiez, modifiez si besoin, puis enregistrez dans votre stock.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 text-sm">
            <span className="text-stone-400">Réf. :</span>
            <span className="font-mono font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
              {sku}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              result.confidence === "eleve"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : result.confidence === "moyen"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-orange-50 text-orange-700 border-orange-200"
            }`}
          >
            Confiance : {CONFIDENCE_LABELS[result.confidence] || "Faible"}
          </span>
        </div>
      </div>

      {result.notes && (
        <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">{result.notes}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Photos + listing preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="flex gap-2 overflow-x-auto p-3">
              {photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`Photo ${i + 1}`}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-700">Aperçu de l'annonce</h3>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  copied
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copier
                  </>
                )}
              </button>
            </div>
            <div className="bg-stone-50 rounded-lg p-4 text-sm text-stone-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {fullListing}
            </div>
          </div>
        </div>

        {/* Right: Tabs + editable fields */}
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 bg-white rounded-xl border border-stone-200 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary-50 text-primary-700"
                    : "text-stone-500 hover:bg-stone-50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Details */}
          {activeTab === "details" && (
            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4 animate-fade-in">
              <Field
                label="Titre Vinted"
                value={edited.vinted_title}
                onChange={(v) => setEdited({ ...edited, vinted_title: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Marque"
                  value={edited.brand}
                  onChange={(v) => setEdited({ ...edited, brand: v })}
                  placeholder="Non identifiée"
                />
                <Field
                  label="Catégorie"
                  value={edited.category}
                  onChange={(v) => setEdited({ ...edited, category: v })}
                  placeholder="Type de vêtement"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Modèle"
                  value={edited.model}
                  onChange={(v) => setEdited({ ...edited, model: v })}
                  placeholder="Si identifié"
                />
                <Field
                  label="Taille"
                  value={edited.size}
                  onChange={(v) => setEdited({ ...edited, size: v })}
                  placeholder="Si visible"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Couleur"
                  value={edited.color}
                  onChange={(v) => setEdited({ ...edited, color: v })}
                />
                <Field
                  label="Matière"
                  value={edited.material}
                  onChange={(v) => setEdited({ ...edited, material: v })}
                  placeholder="Si visible"
                />
              </div>
              <Field
                label="État"
                value={edited.condition}
                onChange={(v) => setEdited({ ...edited, condition: v })}
              />
              <Field
                label="Défauts"
                value={edited.defects}
                onChange={(v) => setEdited({ ...edited, defects: v })}
                placeholder="Aucun défaut visible"
              />

              <div className="pt-2 border-t border-stone-100">
                <h4 className="text-xs font-medium text-stone-500 mb-3 flex items-center gap-2">
                  <Euro className="w-4 h-4" /> Prix
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Prix de vente (€)"
                    type="number"
                    value={edited.selling_price}
                    onChange={(v) => setEdited({ ...edited, selling_price: v })}
                  />
                  <Field
                    label="Prix d'achat (€)"
                    type="number"
                    value={edited.purchase_price}
                    onChange={(v) => setEdited({ ...edited, purchase_price: v })}
                    placeholder="Facultatif"
                  />
                </div>
                {edited.selling_price && edited.purchase_price && (
                  <p className="text-sm text-stone-500 mt-2">
                    Marge estimée :{" "}
                    <span className="font-semibold text-emerald-600">
                      {(
                        parseFloat(edited.selling_price) -
                        parseFloat(edited.purchase_price)
                      ).toFixed(2)}{" "}
                      €
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab: Description */}
          {activeTab === "description" && (
            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4 animate-fade-in">
              <h3 className="font-semibold text-stone-700 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Description & Hashtags
              </h3>
              <Field
                label="Description"
                value={edited.description}
                onChange={(v) => setEdited({ ...edited, description: v })}
                multiline
              />
              <Field
                label="Hashtags (séparés par des virgules)"
                value={edited.hashtags}
                onChange={(v) => setEdited({ ...edited, hashtags: v })}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {edited.hashtags
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded-md"
                    >
                      <Hash className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {saveError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-stone-600 rounded-xl font-medium hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" /> Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Enregistrement..." : "Enregistrer dans le stock"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildListingText(
  e: {
    vinted_title: string;
    brand: string;
    size: string;
    condition: string;
    description: string;
    hashtags: string;
    selling_price: string;
    consignes: string;
  },
  _sku: string
): string {
  const tags = e.hashtags
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `#${s}`)
    .join(" ");

  const price = e.selling_price ? `\n\nPrix conseillé : ${e.selling_price} €` : "";

  const consignesText = e.consignes.trim()
    ? `\n\n${e.consignes.trim()}`
    : "";

  return `${e.vinted_title}\n\n${e.description}${consignesText}\n\n${tags}${price}`;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={6}
          className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-y"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        />
      )}
    </div>
  );
}
