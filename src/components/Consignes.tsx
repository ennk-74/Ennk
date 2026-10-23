import { useState } from "react";
import { ClipboardList, Check } from "lucide-react";
import { getConsignes, setConsignes } from "@/lib/consignes";

export function Consignes() {
  const [text, setText] = useState(getConsignes());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setConsignes(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-xl font-bold text-stone-800 mb-2">Consignes</h2>
      <p className="text-sm text-stone-500 mb-6">
        Texte libre ajouté automatiquement à chaque annonce, entre la
        description et les hashtags.
      </p>

      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">
              Texte des consignes
            </h3>
            <p className="text-sm text-stone-500">
              Sauvegardé et pré-rempli pour les prochaines annonces.
            </p>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={
            "Ex:\n- Envoi rapide et soigné sous 48h\n- Paiement par Lydia accepté\n- Remise pour lots (3 articles = -10%)\n- N'hésitez pas à poser vos questions !"
          }
          className="w-full px-4 py-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-y"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Enregistré !
              </>
            ) : (
              "Enregistrer"
            )}
          </button>
          <button
            onClick={() => setText("")}
            className="text-sm text-stone-500 hover:text-stone-700 underline"
          >
            Effacer
          </button>
          <span className="text-xs text-stone-400 ml-auto">
            {text.length} caractères
          </span>
        </div>
      </div>
    </div>
  );
}
