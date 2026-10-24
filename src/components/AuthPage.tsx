import { useState } from "react";
import { Shirt, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        if (password.length < 6) {
          throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }
        await signUp(email.trim(), password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      if (msg.includes("Invalid login credentials")) {
        setError("Email ou mot de passe incorrect.");
      } else if (msg.includes("already registered") || msg.includes("already been registered")) {
        setError("Un compte existe déjà avec cet email. Connectez-vous.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
              <Shirt className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-stone-800">StyleStock AI</span>
          </div>
          <p className="text-sm text-stone-500">
            Gérez votre stock de vêtements de seconde main
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode("signin"); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === "signin"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === "signup"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === "signin" ? "Connexion..." : "Création du compte..."}
                </>
              ) : (
                mode === "signin" ? "Se connecter" : "Créer mon compte"
              )}
            </button>
          </form>

          {mode === "signup" && (
            <p className="mt-4 text-xs text-stone-400 text-center">
              En vous inscrivant, vous créez un compte privé. Vos données seront
              isolées et invisibles aux autres utilisateurs.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
