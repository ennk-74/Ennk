import { useState, useEffect } from "react";
import { Shirt, Sparkles, Package, Settings as SettingsIcon, ClipboardList, Upload } from "lucide-react";
import { AddPhotos } from "@/components/AddPhotos";
import { Inventory } from "@/components/Inventory";
import { Settings } from "@/components/Settings";
import { Consignes } from "@/components/Consignes";

type View = "home" | "inventory" | "consignes" | "settings";

function App() {
  const [view, setView] = useState<View>("home");
  const [refreshKey, setRefreshKey] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (view === "inventory" || view === "home") {
      refresh();
    }
  }, [view]);

  const goToHome = () => setView("home");
  const goToInventory = () => setView("inventory");
  const goToConsignes = () => setView("consignes");
  const goToSettings = () => setView("settings");

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={goToHome} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-stone-800 group-hover:text-primary-600 transition-colors">
              StyleStock AI
            </span>
          </button>

          <nav className="flex items-center gap-1">
            <NavButton
              active={view === "home"}
              onClick={goToHome}
              icon={<Sparkles className="w-4 h-4" />}
              label="Générer"
            />
            <NavButton
              active={view === "inventory"}
              onClick={goToInventory}
              icon={<Package className="w-4 h-4" />}
              label="Stock"
            />
            <NavButton
              active={view === "consignes"}
              onClick={goToConsignes}
              icon={<ClipboardList className="w-4 h-4" />}
              label="Consignes"
            />
            <NavButton
              active={view === "settings"}
              onClick={goToSettings}
              icon={<SettingsIcon className="w-4 h-4" />}
              label="Paramètres"
            />
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {view === "home" && (
          <HomeView
            onSaved={() => {
              setItemCount((c) => c + 1);
              refresh();
            }}
            onGoToInventory={goToInventory}
            refreshKey={refreshKey}
          />
        )}
        {view === "inventory" && <Inventory refreshKey={refreshKey} />}
        {view === "consignes" && <Consignes />}
        {view === "settings" && <Settings />}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-stone-400">
          <span>StyleStock AI — Gestion de stock de seconde main</span>
          <span>Les photos sont analysées par Google Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-primary-50 text-primary-700"
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function HomeView({
  onSaved,
  onGoToInventory,
  refreshKey,
}: {
  onSaved: () => void;
  onGoToInventory: () => void;
  refreshKey: number;
}) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto pt-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 tracking-tight">
          Transformez vos photos en annonces
        </h1>
        <p className="mt-3 text-stone-500">
          Déposez les photos d'un vêtement, l'IA l'analyse et génère une
          annonce prête pour Vinted. Enregistrez dans votre stock et passez au
          suivant.
        </p>
      </div>

      {/* Big add button */}
      <div className="flex flex-col items-center">
        <BigAddButton />
      </div>

      {/* Photo upload + generation flow */}
      <AddPhotos onSaved={onSaved} />

      {/* Quick inventory preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-700">
            Stock récent
          </h2>
          <button
            onClick={onGoToInventory}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Voir tout →
          </button>
        </div>
        <Inventory refreshKey={refreshKey} />
      </div>
    </div>
  );
}

function BigAddButton() {
  return (
    <label
      htmlFor="photo-input-home"
      className="cursor-pointer group"
    >
      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col items-center justify-center shadow-xl shadow-primary-200 group-hover:scale-105 transition-transform duration-300">
        <Upload className="w-12 h-12 text-white mb-2" />
        <span className="text-white font-semibold text-lg">
          Ajouter des photos
        </span>
        <span className="text-primary-100 text-xs mt-1">
          Glisser ou cliquer
        </span>
      </div>
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        id="photo-input-home"
        onChange={() => {
          const input = document.getElementById("photo-input-home") as HTMLInputElement;
          if (input.files && input.files.length > 0) {
            // Forward files to the AddPhotos component by simulating drop
            const dt = new DataTransfer();
            Array.from(input.files).forEach((f) => dt.items.add(f));
            const addPhotosInput = document.getElementById("photo-input") as HTMLInputElement;
            if (addPhotosInput) {
              addPhotosInput.files = dt.files;
              addPhotosInput.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
        }}
      />
    </label>
  );
}

export default App;
