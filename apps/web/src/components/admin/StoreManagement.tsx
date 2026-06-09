import { useEffect, useState } from "react";
import { FiEdit2, FiSearch, FiPlus, FiEye, FiEyeOff } from "react-icons/fi";
import { TbLayoutGrid } from "react-icons/tb";
import { getAdminProducts, deleteProduct, updateProduct } from "../../services/adminStoreService";
import type { AdminProduct } from "../../types";
import AddProductForm from "./AddProductForm";
import EditProductForm from "./EditProductForm";
import ConfirmDialog from "./ConfirmDialog";
import "../../styles/profile.css";

type StatusToggleRequest = {
  product: AdminProduct;
  mode: "hide" | "show";
};

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

function ProductImage({ src, name, className = "w-10 h-10" }: { src: string | null; name: string; className?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${className} rounded-lg object-cover bg-gray-100 flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${className} rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0`}>
      <span className="text-gray-400 text-xs font-bold">IMG</span>
    </div>
  );
}

function ProductListCard({
  product,
  deletingId,
  onToggleStatus,
  onEdit,
}: {
  product: AdminProduct;
  deletingId: string | null;
  onToggleStatus: (product: AdminProduct) => void;
  onEdit: (product: AdminProduct) => void;
}) {
  return (
    <article className="rounded-xl border border-gray-100 bg-[#f8f9fc] p-3">
      <div className="flex gap-3">
        <ProductImage src={product.image} name={product.name} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-800">
            {product.name}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <RarityBadge rarity={product.rarity} />
            <span className="text-[11px] text-gray-500">{product.category ?? "—"}</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Price
          </span>
          <span className="font-semibold text-gray-800">{formatPrice(product.variants)}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Stock
          </span>
          <StockCell product={product} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-4 border-t border-gray-100 pt-2">
        <button
          onClick={() => onToggleStatus(product)}
          disabled={deletingId === product.id}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors disabled:opacity-40"
          title={product.status === "active" ? "Hide from store" : "Show in store"}
        >
          {product.status === "active" ? (
            <>
              <FiEye size={15} className="text-blue-500" />
              Visible
            </>
          ) : (
            <>
              <FiEyeOff size={15} className="text-gray-400" />
              Hidden
            </>
          )}
        </button>
        <button
          onClick={() => onEdit(product)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition-colors"
          title="Edit product"
        >
          <FiEdit2 size={15} />
          Edit
        </button>
      </div>
    </article>
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
  const [statusToggleRequest, setStatusToggleRequest] =
    useState<StatusToggleRequest | null>(null);
  const [actionError, setActionError] = useState("");

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

  function requestToggleStatus(product: AdminProduct) {
    setActionError("");
    setStatusToggleRequest({
      product,
      mode: product.status === "active" ? "hide" : "show",
    });
  }

  async function confirmToggleStatus() {
    if (!statusToggleRequest) return;

    const { product } = statusToggleRequest;
    const isActive = product.status === "active";

    try {
      setActionError("");
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
      setStatusToggleRequest(null);
    } catch (e) {
      setActionError((e as Error).message);
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

  const isHiding = statusToggleRequest?.mode === "hide";
  const pendingProduct = statusToggleRequest?.product;

  return (
    <div className="personal-info-section">
      <ConfirmDialog
        isOpen={statusToggleRequest !== null}
        title={
          isHiding
            ? "Hide product from store?"
            : "Show product in store?"
        }
        message={
          isHiding
            ? `"${pendingProduct?.name ?? "This product"}" will be deactivated and will no longer appear in the store. You can show it again later.`
            : `"${pendingProduct?.name ?? "This product"}" will be reactivated and will appear in the store again.`
        }
        confirmLabel={isHiding ? "Hide product" : "Show product"}
        confirmVariant={isHiding ? "danger" : "primary"}
        loading={deletingId === pendingProduct?.id}
        onConfirm={() => void confirmToggleStatus()}
        errorMessage={actionError || undefined}
        onCancel={() => {
          if (deletingId) return;
          setStatusToggleRequest(null);
          setActionError("");
        }}
      />
      <div className="mb-4 sm:mb-6">
        <h2 className="m-0 text-lg font-extrabold uppercase tracking-[1px] text-[#0d1f3c] sm:text-[22px]">
          Store Management
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-[#9aa3b2]">
          Manage the store and products
        </p>
      </div>

      <div className="personal-info-card overflow-hidden" style={{ borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.08)", background: "white" }}>

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
            <div className="flex items-center gap-1 border-b border-gray-200 px-3 pt-2 sm:px-6 sm:pt-4">
              <button
                onClick={() => setTab("list")}
                className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold border-b-2 transition-colors sm:flex-none sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
                  tab === "list"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <TbLayoutGrid size={15} />
                Products List
              </button>
              <button
                onClick={() => setTab("add")}
                className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold border-b-2 transition-colors sm:flex-none sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
                  tab === "add"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FiPlus size={14} />
                Add Product
              </button>
            </div>

            {/* ── Products List ── */}
            {tab === "list" && (
              <div className="p-3 sm:p-6">
                <div className="relative mb-4 sm:mb-6">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:left-4" size={16} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:py-3 sm:pl-10"
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
                    <div className="space-y-3 lg:hidden">
                      {filtered.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">No products found.</p>
                      ) : (
                        filtered.map((product) => (
                          <ProductListCard
                            key={product.id}
                            product={product}
                            deletingId={deletingId}
                            onToggleStatus={requestToggleStatus}
                            onEdit={setEditingProduct}
                          />
                        ))
                      )}
                    </div>

                    <div className="hidden lg:block">
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
                                  onClick={() => requestToggleStatus(product)}
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
                    <p className="mt-3 text-xs text-gray-400 sm:mt-4">
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
