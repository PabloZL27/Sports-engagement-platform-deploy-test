import { useEffect, useState } from "react";
import { FiEdit2, FiSearch, FiPlus, FiEye, FiEyeOff } from "react-icons/fi";
import { TbLayoutGrid } from "react-icons/tb";
import { getAdminProducts, deleteProduct, updateProduct } from "../../services/adminStoreService";
import type { AdminProduct } from "../../types";
import AddProductForm from "./AddProductForm";
import EditProductForm from "./EditProductForm";
import "../../styles/profile.css";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatPrice(variants: AdminProduct["variants"]): string {
  if (!variants.length) return "—";
  const amounts = variants.map((v) => v.unit_amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return min === max ? fmt(min) : `From ${fmt(min)}`;
}

const RARITY_STYLES: Record<string, string> = {
  Standard: "bg-gray-100 text-gray-600",
  New:      "bg-blue-100 text-blue-700",
  Limited:  "bg-yellow-100 text-yellow-700",
};

// ─── Sub-components ────────────────────────────────────────────────────────

function RarityBadge({ rarity }: { rarity: string | null }) {
  const label = rarity ?? "Standard";
  const style = RARITY_STYLES[label] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return status === "active" ? (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      active
    </span>
  ) : (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
      inactive
    </span>
  );
}

function StockCell({ product }: { product: AdminProduct }) {
  const { totalStock, variants, product_type } = product;
  const variantCount = product_type !== "no_size" ? variants.length : 0;
  const isLow = totalStock > 0 && totalStock < 15;

  if (variantCount > 1) {
    return (
      <span className="text-blue-600 font-medium text-sm">
        {totalStock} units ({variantCount} variants)
      </span>
    );
  }

  return (
    <span className={`font-medium text-sm ${isLow ? "text-red-500" : "text-gray-700"}`}>
      {totalStock} units
    </span>
  );
}

function ProductImage({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
      <span className="text-gray-400 text-xs font-bold">IMG</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

type Tab = "list" | "add";

export default function StoreManagement() {
  const [tab, setTab] = useState<Tab>("list");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const { products: data } = await getAdminProducts();
        if (mounted) setProducts(data);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleToggleStatus(product: AdminProduct) {
    const isActive = product.status === "active";
    const msg = isActive
      ? "Deactivate this product? It will no longer appear in the store."
      : "Reactivate this product? It will appear in the store again.";
    if (!confirm(msg)) return;

    try {
      setDeletingId(product.id);
      if (isActive) {
        await deleteProduct(product.id);
      } else {
        const formData = new FormData();
        formData.append("name", product.name);
        formData.append("category", product.category ?? "");
        formData.append("product_type", product.product_type ?? "no_size");
        formData.append("rarity", product.rarity ?? "Standard");
        formData.append("status", "active");
        formData.append("basePrice", product.variants.length
          ? String(Math.min(...product.variants.map((v) => v.unit_amount)) / 100)
          : "0"
        );
        await updateProduct(product.id, formData);
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, status: isActive ? "inactive" : "active" }
            : p
        )
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  async function reloadProducts() {
    setLoading(true);
    try {
      const { products: data } = await getAdminProducts();
      setProducts(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="personal-info-section">
      <div className="personal-info-header">
        <h2>STORE MANAGEMENT</h2>
        <p>Manage the store and products</p>
      </div>

      <div className="personal-info-card" style={{ borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.08)", background: "white" }}>

        {/* ── Edit mode: ocupa todo el card ── */}
        {editingProduct ? (
          <EditProductForm
            product={editingProduct}
            onSuccess={() => { setEditingProduct(null); void reloadProducts(); }}
            onCancel={() => setEditingProduct(null)}
          />
        ) : (
          <>
            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 border-b border-gray-200 px-6 pt-4">
              <button
                onClick={() => setTab("list")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === "list"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <TbLayoutGrid size={16} />
                Products List
              </button>
              <button
                onClick={() => setTab("add")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === "add"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FiPlus size={15} />
                Add Product
              </button>
            </div>

            {/* ── Products List ── */}
            {tab === "list" && (
              <div className="p-6">
                <div className="relative mb-6">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {loading && (
                  <div className="py-16 text-center text-gray-400 text-sm">Loading products...</div>
                )}
                {error && !loading && (
                  <div className="py-8 text-center text-red-500 text-sm">{error}</div>
                )}

                {!loading && !error && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["Product Name", "Category", "Rarity", "Price", "Stock"].map((h) => (
                              <th key={h} className="text-left py-3 px-4 text-gray-400 font-semibold text-xs uppercase tracking-wide">
                                {h}
                              </th>
                            ))}
                            <th className="text-center py-3 px-4 text-gray-400 font-semibold text-xs uppercase tracking-wide">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold text-xs uppercase tracking-wide">
                              Edit
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-gray-400">
                                No products found.
                              </td>
                            </tr>
                          )}
                          {filtered.map((product) => (
                            <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <ProductImage src={product.image} name={product.name} />
                                  <span className="font-semibold text-gray-800">{product.name}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-gray-600">{product.category ?? "—"}</td>
                              <td className="py-4 px-4"><RarityBadge rarity={product.rarity} /></td>
                              <td className="py-4 px-4 font-semibold text-gray-800">{formatPrice(product.variants)}</td>
                              <td className="py-4 px-4"><StockCell product={product} /></td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  onClick={() => handleToggleStatus(product)}
                                  disabled={deletingId === product.id}
                                  className="transition-colors disabled:opacity-40 inline-flex items-center justify-center"
                                  title={product.status === "active" ? "Hide from store" : "Show in store"}
                                >
                                  {product.status === "active"
                                    ? <FiEye size={17} className="text-blue-500 hover:text-blue-700" />
                                    : <FiEyeOff size={17} className="text-gray-400 hover:text-gray-600" />
                                  }
                                </button>
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => setEditingProduct(product)}
                                  className="text-blue-500 hover:text-blue-700 transition-colors"
                                  title="Edit product"
                                >
                                  <FiEdit2 size={17} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-4 text-xs text-gray-400">
                      Showing {filtered.length} of {products.length} products
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ── Add Product ── */}
            {tab === "add" && (
              <AddProductForm
                onSuccess={() => { setTab("list"); void reloadProducts(); }}
                onCancel={() => setTab("list")}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
