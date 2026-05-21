import { useRef, useState } from "react";
import { FiUploadCloud, FiTrash2, FiPlus } from "react-icons/fi";
import { createProduct } from "../../services/adminStoreService";

// ─── Constants ─────────────────────────────────────────────────────────────

type ProductType = "clothing" | "footwear" | "no_size";

const CATEGORY_OPTIONS: { label: string; product_type: ProductType }[] = [
  { label: "Clothing",     product_type: "clothing"  },
  { label: "Footwear",     product_type: "footwear"  },
  { label: "Accessories",  product_type: "no_size"   },
  { label: "Collectibles", product_type: "no_size"   },
  { label: "Home Goods",   product_type: "no_size"   },
];

const RARITY_OPTIONS = ["Standard", "New", "Limited"];

const SIZES_BY_TYPE: Record<"clothing" | "footwear", string[]> = {
  clothing: ["XS", "S", "M", "L", "XL", "XXL"],
  footwear: ["25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35"],
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface Variant {
  size: string;
  stock: string;
  sku: string;
  priceOverride: string;
}

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AddProductForm({ onSuccess, onCancel }: Props) {
  // Basic info
  const [name, setName]           = useState("");
  const [category, setCategory]   = useState("");
  const [productType, setProductType] = useState<ProductType | "">("");
  const [rarity, setRarity]       = useState("");
  const [basePrice, setBasePrice] = useState("");

  // Image
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sizes
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSize, setCustomSize]       = useState("");
  const [extraSizes, setExtraSizes]       = useState<string[]>([]);

  // Variants table
  const [variants, setVariants] = useState<Variant[]>([]);

  // No-size stock
  const [stock, setStock] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  // ── Handlers ──

  function handleCategoryChange(label: string) {
    const opt = CATEGORY_OPTIONS.find((o) => o.label === label);
    setCategory(label);
    setProductType(opt?.product_type ?? "");
    // Reset size state when category changes
    setSelectedSizes([]);
    setExtraSizes([]);
    setVariants([]);
    setStock("");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function handleAddCustomSize() {
    const trimmed = customSize.trim();
    if (!trimmed || extraSizes.includes(trimmed) || selectedSizes.includes(trimmed)) return;
    setExtraSizes((prev) => [...prev, trimmed]);
    setSelectedSizes((prev) => [...prev, trimmed]);
    setCustomSize("");
  }

  function generateVariants() {
    if (!selectedSizes.length) return;
    setVariants(
      selectedSizes.map((size) => ({
        size,
        stock: "",
        sku: "",
        priceOverride: "",
      }))
    );
  }

  function updateVariant(index: number, field: keyof Variant, value: string) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function removeVariant(index: number) {
    const removed = variants[index].size;
    setVariants((prev) => prev.filter((_, i) => i !== index));
    setSelectedSizes((prev) => prev.filter((s) => s !== removed));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validations
    if (!name.trim() || !category || !rarity || !basePrice) {
      setError("Please fill in all required fields.");
      return;
    }
    if (productType !== "no_size" && variants.length === 0) {
      setError("Please generate and configure at least one size variant.");
      return;
    }
    if (productType === "no_size" && !stock) {
      setError("Please enter the stock quantity.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("category", category);
      formData.append("product_type", productType);
      formData.append("rarity", rarity);
      formData.append("basePrice", basePrice);

      if (productType === "no_size") {
        formData.append("stock", stock);
      } else {
        formData.append(
          "variants",
          JSON.stringify(
            variants.map((v) => ({
              size: v.size,
              stock: parseInt(v.stock) || 0,
              sku: v.sku || undefined,
              priceOverride: v.priceOverride ? parseFloat(v.priceOverride) : undefined,
            }))
          )
        );
      }

      if (imageFile) formData.append("image", imageFile);

      await createProduct(formData);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Computed ──
  const predefinedSizes =
    productType === "clothing" || productType === "footwear"
      ? SIZES_BY_TYPE[productType]
      : [];
  const allAvailableSizes = [...predefinedSizes, ...extraSizes];
  const basePriceNum = parseFloat(basePrice) || 0;

  // ── Render ──

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800">Add New Product</h3>
        <p className="text-sm text-gray-400 mt-1">Fill in the details to add a new product</p>
      </div>

      {/* ── Basic Information ── */}
      <section className="border border-gray-100 rounded-2xl p-5 space-y-4">
        <h4 className="font-bold text-gray-700 text-sm">Basic Information</h4>

        {/* Product Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter product name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        {/* Category + Rarity row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white"
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.label} value={o.label}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Rarity / Status <span className="text-red-500">*</span>
            </label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white"
            >
              <option value="">Select rarity</option>
              {RARITY_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Base Price */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Base Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
            <input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>
      </section>

      {/* ── Product Image ── */}
      <section className="border border-gray-100 rounded-2xl p-5">
        <h4 className="font-bold text-gray-700 text-sm mb-4">Product Image</h4>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition"
        >
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Preview"
              className="h-32 object-contain rounded-xl"
            />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <FiUploadCloud size={22} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">Click to upload image</p>
              <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleImageChange}
          className="hidden"
        />
        {imageFile && (
          <p className="mt-2 text-xs text-gray-400 text-center">{imageFile.name}</p>
        )}
      </section>

      {/* ── Size & Variants (clothing / footwear) ── */}
      {(productType === "clothing" || productType === "footwear") && (
        <section className="border border-gray-100 rounded-2xl p-5 space-y-4">
          <h4 className="font-bold text-gray-700 text-sm">Size &amp; Variants</h4>

          {/* Size chips */}
          <div>
            <p className="text-xs text-gray-500 mb-3">Select Sizes Available</p>
            <div className="flex flex-wrap gap-2">
              {allAvailableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`w-12 h-10 rounded-xl text-sm font-semibold border transition ${
                    selectedSizes.includes(size)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Custom size */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add custom size"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomSize())}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
            <button
              type="button"
              onClick={handleAddCustomSize}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition"
            >
              <FiPlus size={14} /> Add
            </button>
          </div>

          {/* Generate Variants button */}
          <button
            type="button"
            onClick={generateVariants}
            disabled={!selectedSizes.length}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Generate Variants ({selectedSizes.length} size{selectedSizes.length !== 1 ? "s" : ""})
          </button>

          {/* Variants table */}
          {variants.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-3">Product Variants</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Size", "Stock", "SKU", "Price Override", "Actions"].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs text-gray-400 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.size} className="border-b border-gray-50">
                      <td className="py-3 px-3 font-semibold text-gray-700">{v.size}</td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={v.stock}
                          onChange={(e) => updateVariant(i, "stock", e.target.value)}
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
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          className="text-red-400 hover:text-red-600 transition"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Base price hint */}
              <div className="mt-3 bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
                <span className="font-bold">Base Price:</span> ${basePriceNum.toFixed(2)} — Use price override to set different prices for specific sizes.
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Stock (no_size) ── */}
      {productType === "no_size" && (
        <section className="border border-gray-100 rounded-2xl p-5">
          <h4 className="font-bold text-gray-700 text-sm mb-4">Stock</h4>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Available Units <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-40 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </section>
      )}

      {/* ── Error ── */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Adding..." : "Add Product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
        >
          ✕ Cancel
        </button>
      </div>
    </form>
  );
}
