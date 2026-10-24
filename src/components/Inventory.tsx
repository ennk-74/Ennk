import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Package,
  Trash2,
  ExternalLink,
  X,
  Copy,
  Check,
  Download,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ClothingItem, ClothingStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";

const BUCKET = "clothing-photos";

async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 3600);

  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.signedUrl) {
      map[item.path] = item.signedUrl;
    }
  }
  return map;
}

interface InventoryProps {
  refreshKey: number;
}

export function Inventory({ refreshKey }: InventoryProps) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClothingStatus | "all">("all");
  const [selected, setSelected] = useState<ClothingItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clothing_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setItems((data as ClothingItem[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshKey]);

  const allPhotoPaths = useMemo(() => {
    const paths: string[] = [];
    for (const item of items) {
      if (item.photos) {
        for (const p of item.photos) {
          if (!p.startsWith("http")) paths.push(p);
        }
      }
    }
    return paths;
  }, [items]);

  useEffect(() => {
    if (allPhotoPaths.length === 0) return;
    let cancelled = false;
    getSignedUrls(allPhotoPaths).then((urls) => {
      if (!cancelled) setPhotoUrls(urls);
    });
    return () => { cancelled = true; };
  }, [allPhotoPaths]);

  const getPhotoUrl = (path: string): string => {
    if (path.startsWith("http")) return path;
    return photoUrls[path] || "";
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.brand?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.size?.toLowerCase().includes(q) ||
          item.color?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce vêtement du stock ?")) return;
    const { error } = await supabase.from("clothing_items").delete().eq("id", id);
    if (error) {
      alert("Erreur lors de la suppression.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelected(null);
  };

  const handleStatusChange = async (id: string, status: ClothingStatus) => {
    const { error } = await supabase
      .from("clothing_items")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
    setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stylestock-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyListing = async (item: ClothingItem) => {
    const text = buildFullListing(item);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return counts;
  }, [items]);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, marque, taille, catégorie..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ClothingStatus | "all")
            }
            className="px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="a_verifier">À vérifier</option>
            <option value="annonce_prete">Annonce prête</option>
            <option value="en_ligne">En ligne</option>
            <option value="vendu">Vendu</option>
          </select>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-600"
          >
            <Download className="w-4 h-4" /> Exporter
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <StatusPill
          label="Total"
          count={items.length}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        {(Object.keys(STATUS_LABELS) as ClothingStatus[]).map((s) => (
          <StatusPill
            key={s}
            label={STATUS_LABELS[s]}
            count={statusCounts[s] || 0}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Package className="w-8 h-8 text-stone-300 animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
            <Package className="w-8 h-8 text-stone-300" />
          </div>
          <p className="mt-4 text-stone-500 font-medium">
            {items.length === 0
              ? "Votre stock est vide"
              : "Aucun résultat pour cette recherche"}
          </p>
          <p className="mt-1 text-sm text-stone-400">
            {items.length === 0
              ? "Ajoutez des photos pour créer votre première fiche"
              : "Essayez un autre terme ou statut"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              photoUrl={item.photos?.[0] ? getPhotoUrl(item.photos[0]) : ""}
              onClick={() => setSelected(item)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ItemDetail
          item={selected}
          photoUrls={photoUrls}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onCopyListing={handleCopyListing}
          copied={copied}
        />
      )}
    </div>
  );
}

function StatusPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
        active
          ? "bg-primary-600 text-white border-primary-600"
          : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
      }`}
    >
      {label}
      <span
        className={`text-xs px-1.5 rounded-full ${
          active ? "bg-white/20" : "bg-stone-100"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ClothingCard({
  item,
  photoUrl,
  onClick,
}: {
  item: ClothingItem;
  photoUrl: string;
  onClick: () => void;
}) {
  const margin =
    item.selling_price != null && item.purchase_price != null
      ? item.selling_price - item.purchase_price
      : null;

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-stone-300 transition-all text-left"
    >
      <div className="aspect-square bg-stone-100 overflow-hidden relative">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={item.title || "Vêtement"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-stone-300" />
          </div>
        )}
        <span
          className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full border font-medium ${
            STATUS_COLORS[item.status]
          }`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-stone-700 line-clamp-1">
          {item.title || "Sans titre"}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-stone-400">
            {item.sku && (
              <span className="font-mono text-primary-500 mr-1">{item.sku}</span>
            )}
            {item.brand || "Marque ?"}
            {item.size && ` · ${item.size}`}
          </p>
          {item.selling_price != null && (
            <p className="text-sm font-semibold text-stone-700">
              {item.selling_price}€
            </p>
          )}
        </div>
        {margin != null && (
          <p className="text-xs text-emerald-600 mt-0.5">
            Marge : {margin.toFixed(2)}€
          </p>
        )}
      </div>
    </button>
  );
}

function ItemDetail({
  item,
  photoUrls,
  onClose,
  onDelete,
  onStatusChange,
  onCopyListing,
  copied,
}: {
  item: ClothingItem;
  photoUrls: Record<string, string>;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ClothingStatus) => void;
  onCopyListing: (item: ClothingItem) => void;
  copied: boolean;
}) {
  const margin =
    item.selling_price != null && item.purchase_price != null
      ? item.selling_price - item.purchase_price
      : null;

  const getPhotoUrl = (path: string): string => {
    if (path.startsWith("http")) return path;
    return photoUrls[path] || "";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            {item.sku && (
              <span className="font-mono text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded flex-shrink-0">
                {item.sku}
              </span>
            )}
            <h3 className="font-semibold text-stone-800 truncate">
              {item.title || "Vêtement sans titre"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {item.photos && item.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {item.photos.map((photo, i) => {
                const url = getPhotoUrl(photo);
                if (!url) return null;
                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 relative group"
                  >
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">
              Statut
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABELS) as ClothingStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(item.id, s)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    item.status === s
                      ? STATUS_COLORS[s]
                      : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {item.sku && (
            <div className="bg-primary-50 rounded-lg px-3 py-2">
              <p className="text-xs text-primary-400">Référence (SKU)</p>
              <p className="text-sm font-mono font-semibold text-primary-700 mt-0.5">
                {item.sku}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Marque" value={item.brand} />
            <InfoRow label="Catégorie" value={item.category} />
            <InfoRow label="Modèle" value={item.model} />
            <InfoRow label="Taille" value={item.size} />
            <InfoRow label="Couleur" value={item.color} />
            <InfoRow label="Matière" value={item.material} />
            <InfoRow label="État" value={item.condition} />
            <InfoRow label="Défauts" value={item.defects} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 rounded-lg p-3 text-center">
              <p className="text-xs text-stone-400">Prix d'achat</p>
              <p className="text-lg font-semibold text-stone-700">
                {item.purchase_price != null
                  ? `${item.purchase_price}€`
                  : "—"}
              </p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 text-center">
              <p className="text-xs text-stone-400">Prix de vente</p>
              <p className="text-lg font-semibold text-stone-700">
                {item.selling_price != null
                  ? `${item.selling_price}€`
                  : "—"}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 text-center ${
                margin != null ? "bg-emerald-50" : "bg-stone-50"
              }`}
            >
              <p className="text-xs text-stone-400">Marge</p>
              <p
                className={`text-lg font-semibold ${
                  margin != null ? "text-emerald-600" : "text-stone-400"
                }`}
              >
                {margin != null ? `${margin.toFixed(2)}€` : "—"}
              </p>
            </div>
          </div>

          {item.ai_notes && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">{item.ai_notes}</p>
            </div>
          )}

          {item.description && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-stone-500">
                  Annonce
                </label>
                <button
                  onClick={() => onCopyListing(item)}
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    copied
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copier l'annonce
                    </>
                  )}
                </button>
              </div>
              <div className="bg-stone-50 rounded-lg p-4 text-sm text-stone-700 whitespace-pre-wrap">
                {buildFullListing(item)}
              </div>
            </div>
          )}

          {item.hashtags && item.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-stone-100">
            <button
              onClick={() => onDelete(item.id)}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" /> Supprimer du stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-stone-50 rounded-lg px-3 py-2">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-sm text-stone-700 mt-0.5">
        {value || <span className="text-stone-300">Non renseigné</span>}
      </p>
    </div>
  );
}

function buildFullListing(item: ClothingItem): string {
  const tags = (item.hashtags || [])
    .map((s) => `#${s}`)
    .join(" ");
  const price = item.selling_price != null ? `\n\nPrix : ${item.selling_price} €` : "";
  const title = item.vinted_title || item.title || "";
  const desc = item.description || "";
  const consignes = item.consignes?.trim() ? `\n\n${item.consignes.trim()}` : "";
  return `${title}\n\n${desc}${consignes}\n\n${tags}${price}`;
}
