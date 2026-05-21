import { useRef, useState } from "react";
import { FiUploadCloud, FiArrowLeft, FiPlus, FiTrash2 } from "react-icons/fi";
import { updateProduct } from "../../services/adminStoreService";
import type { AdminProduct } from "../../types";

const RARITY_OPTIONS = ["Standard", "New", "Limited"];

const SIZES_BY_TYPE: Record<"clothing" | "footwear", string[]> = {
  clothing: ["XS", "S", "M", "L", "XL", "XXL"],
  footwear: ["25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35"],
};

interface EditableVariant {
  priceId: string;
  size: string | null;
  inventory_count: string;
  sku: string;
  priceOverride: string;
  unit_amount: number; // precio actual en centavos (referencia)
}

interface Props {
  product: AdminProduct;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditProductForm({ product, onSuccess, onCancel }: Props) {
  // Basic info — pre-poblado
  const [name, setName]     = useState(product.name);
  const [category]          = useState(product.category ?? "");
  const [rarity, setRarity] = useState(product.rarity ?? "Standard");
  const [status, setStatus] = useState<"active" | "inactive">(product.status);

  // Precio base — inferido del mínimo de las variantes
  const inferredBase = product.variants.length
    ? Math.min(...product.variants.map((v) => v.unit_amount)) / 100
    : 0;
  const [basePrice, setBasePrice] = useState(inferredBase.toFixed(2));

  // Imagen
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product.image);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variantes — pre-pobladas desde el producto
  const [variants, setVariants] = useState<EditableVariant[]>(
    product.variants.map((v) => ({
      priceId:         v.priceId,
      size:            v.size,
      inventory_count: String(v.inventory_count),
      sku:             v.sku ?? "",
      priceOverride:   "", // vacío = usa el precio actual
      unit_amount:     v.unit_amount,
    }))
  );

  // Nuevas tallas a agregar
  const [newSelectedSizes, setNewSelectedSizes] = useState<string[]>([]);
  const [customSize, setCustomSize]             = useState("");
  const [extraSizes, setExtraSizes]             = useState<string[]>([]);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function updateVariant(index: number, field: keyof EditableVariant, value: string) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  // Tallas que ya existen en el producto
  const existingSizes = variants.map((v) => v.size);

  // Tallas predefinidas aún no agregadas
  const predefinedSizes =
    product.product_type === "clothing" || product.product_type === "footwear"
      ? SIZES_BY_TYPE[product.product_type]
      : [];
  const availableToAdd = [...predefinedSizes, ...extraSizes].filter(
    (s) => !existingSizes.includes(s)
  );

  function toggleNewSize(size: string) {
    setNewSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function handleAddCustomSize() {
    const trimmed = customSize.trim();
    if (!trimmed || existingSizes.includes(trimmed) || extraSizes.includes(trimmed)) return;
    setExtraSizes((prev) => [...prev, trimmed]);
    setNewSelectedSizes((prev) => [...prev, trimmed]);
    setCustomSize("");
  }

  function generateNewVariants() {
    if (!newSelectedSizes.length) return;
    const toAdd: EditableVariant[] = newSelectedSizes.map((size) => ({
      priceId:         "", // sin priceId = nueva variante
      size,
      inventory_count: "",
      sku:             "",
      priceOverride:   "",
      unit_amount:     0,
    }));
    setVariants((prev) => [...prev, ...toAdd]);
    setNewSelectedSizes([]);
  }

  function removeNewVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !rarity || !basePrice) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("category", category);
      formData.append("product_type", product.product_type ?? "no_size");
      formData.append("rarity", rarity);
      formData.append("status", status);
      formData.append("basePrice", basePrice);

      // Variantes con priceId para que el backend sepa cuál actualizar
      formData.append(
        "variants",
        JSON.stringify(
          variants.map((v) => ({
            priceId:         v.priceId,
            size:            v.size,
            inventory_count: parseInt(v.inventory_count) || 0,
            sku:             v.sku || "",
            priceOverride:   v.priceOverride ? parseFloat(v.priceOverride) : undefined,
            unit_amount:     v.unit_amount, // precio actual en centavos para comparar en backend
          }))
        )
      );

      if (imageFile) formData.append("image", imageFile);

      await updateProduct(product.id, formData);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const basePriceNum = parseFloat(basePrice) || 0;

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition"
        >
          <FiArrowLeft size={18} />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Edit Product</h3>
          <p className="text-sm text-gray-400 mt-0.5">Update the product details</p>
        </div>
      </div>

      {/* ── Basic Information ── */}
      <section className="border border-gray-100 rounded-2xl p-5 space-y-4">
        <h4 className="font-bold text-gray-700 text-sm">Basic Information</h4>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        {/* Category (read-only) + Rarity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <input
              type="text"
              value={category}
              disabled
              className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Rarity <span className="text-red-500">*</span>
            </label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white"
            >
              {RARITY_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Base Price + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Base Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Product Image ── */}
      <section className="border border-gray-100 rounded-2xl p-5">
        <h4 className="font-bold text-gray-700 text-sm mb-4">Product Image</h4>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition"
        >
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Preview"
              className="h-28 object-contain rounded-xl"
            />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <FiUploadCloud size={22} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">Click to replace image</p>
              <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
            </>
          )}
        </div>
        {imagePreview && (
          <p className="mt-2 text-xs text-center text-gray-400">
            Click the image to replace it
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleImageChange}
          className="hidden"
        />
      </section>

      {/* ── Variants (clothing / footwear) ── */}
      {product.product_type !== "no_size" && (
        <section className="border border-gray-100 rounded-2xl p-5 space-y-4">
          <h4 className="font-bold text-gray-700 text-sm">Stock by Size</h4>

          {/* Tabla de variantes existentes y nuevas */}
          {variants.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Size", "Stock", "SKU", "Price Override", "Current Price", ""].map((h, i) => (
                    <th key={i} className="text-left py-2 px-3 text-xs text-gray-400 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.priceId || v.size} className={`border-b border-gray-50 ${!v.priceId ? "bg-blue-50/40" : ""}`}>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-gray-700">{v.size ?? "—"}</span>
                      {!v.priceId && (
                        <span className="ml-2 text-xs text-blue-500 font-medium">new</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        value={v.inventory_count}
                        onChange={(e) => updateVariant(i, "inventory_count", e.target.value)}
                        className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 transition"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="Optional"
                        value={v.sku}
                        onChange={(e) => updateVariant(i, "sku", e.target.value)}
                        className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 transition"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Use base price"
                        value={v.priceOverride}
                        onChange={(e) => updateVariant(i, "priceOverride", e.target.value)}
                        className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 transition"
                      />
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {v.unit_amount ? `$${(v.unit_amount / 100).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3 px-3">
                      {/* Solo las nuevas se pueden eliminar antes de guardar */}
                      {!v.priceId && (
                        <button
                          type="button"
                          onClick={() => removeNewVariant(i)}
                          className="text-red-400 hover:text-red-600 transition"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
            <span className="font-bold">Base Price:</span> ${basePriceNum.toFixed(2)} — Leave Price Override empty to keep the current price per size.
          </div>

          {/* Selector de nuevas tallas */}
          {availableToAdd.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-bold text-gray-600">Add New Sizes</p>
              <div className="flex flex-wrap gap-2">
                {availableToAdd.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleNewSize(size)}
                    className={`w-12 h-10 rounded-xl text-sm font-semibold border transition ${
                      newSelectedSizes.includes(size)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Custom size */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom size"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomSize())}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSize}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition"
                >
                  <FiPlus size={14} /> Add
                </button>
              </div>

              {newSelectedSizes.length > 0 && (
                <button
                  type="button"
                  onClick={generateNewVariants}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Add {newSelectedSizes.length} size{newSelectedSizes.length !== 1 ? "s" : ""} to product
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Stock (no_size) ── */}
      {product.product_type === "no_size" && variants.length > 0 && (
        <section className="border border-gray-100 rounded-2xl p-5">
          <h4 className="font-bold text-gray-700 text-sm mb-4">Stock</h4>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Available Units</label>
            <input
              type="number"
              min="0"
              value={variants[0].inventory_count}
              onChange={(e) => updateVariant(0, "inventory_count", e.target.value)}
              className="w-40 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
