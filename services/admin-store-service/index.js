require("dotenv").config();

const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 4013;

// El webhook necesita el body sin parsear — debe ir ANTES del express.json()
app.use("/webhooks/stripe", express.raw({ type: "application/json" }));
app.use(cors());
app.use(express.json());

// Supabase solo para Storage de imágenes (no se toca ninguna tabla)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Multer: guarda el archivo en memoria antes de subirlo a Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype)) {
      return cb(new Error("Only PNG and JPG images are allowed"));
    }
    cb(null, true);
  },
});

// ─── Helper: subir imagen a Supabase Storage ───────────────────────────────
async function uploadImage(file) {
  if (!file) return null;

  const fileName = `products/${Date.now()}-${file.originalname}`;

  const { error } = await supabase.storage
    .from("store-images")
    .upload(fileName, file.buffer, { contentType: file.mimetype });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from("store-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// ─── Helper: crear Prices en Stripe según el tipo de producto ─────────────
// - no_size  → 1 solo Price con inventory_count = stock total
// - clothing → 1 Price por talla (XS, S, M, L, XL...)
// - footwear → 1 Price por talla numérica (25, 26, 27...)
async function createPrices(productId, productType, basePrice, variants, stock) {
  if (productType === "no_size") {
    return [
      await stripe.prices.create({
        product: productId,
        currency: "usd",
        unit_amount: Math.round(parseFloat(basePrice) * 100),
        metadata: {
          size: "one-size",
          inventory_count: String(stock),
          sku: "",
        },
      }),
    ];
  }

  // clothing o footwear — un Price por cada variante de talla
  return Promise.all(
    variants.map((variant) =>
      stripe.prices.create({
        product: productId,
        currency: "usd",
        unit_amount: variant.priceOverride
          ? Math.round(parseFloat(variant.priceOverride) * 100)
          : Math.round(parseFloat(basePrice) * 100),
        metadata: {
          size: variant.size,
          inventory_count: String(variant.stock),
          sku: variant.sku || "",
        },
      })
    )
  );
}

// ─── Health ────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ service: "admin-store-service", status: "ok", port: PORT });
});

// ─── GET /products ─────────────────────────────────────────────────────────
// Lista todos los productos de Stripe con sus variantes e inventario
app.get("/products", async (req, res) => {
  try {
    // Traer activos e inactivos por separado (Stripe filtra por active por defecto)
    const [activeRes, inactiveRes] = await Promise.all([
      stripe.products.list({ limit: 100, active: true }),
      stripe.products.list({ limit: 100, active: false }),
    ]);
    const allProducts = [...activeRes.data, ...inactiveRes.data];

    const products = await Promise.all(
      allProducts.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        const variants = prices.data.map((price) => ({
          priceId: price.id,
          size: price.metadata.size,
          inventory_count: parseInt(price.metadata.inventory_count || "0"),
          sku: price.metadata.sku || null,
          unit_amount: price.unit_amount,
        }));

        const totalStock = variants.reduce(
          (sum, v) => sum + v.inventory_count,
          0
        );

        return {
          id: product.id,
          name: product.name,
          category: product.metadata.category || null,
          product_type: product.metadata.product_type || null, // clothing | footwear | no_size
          rarity: product.metadata.rarity || null,
          status: product.active ? "active" : "inactive",
          image: product.images[0] || null,
          totalStock,
          variants,
        };
      })
    );

    res.json({ status: "success", products });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// ─── POST /products ────────────────────────────────────────────────────────
// Crea un nuevo producto en Stripe con sus variantes e inventario
app.post("/products", upload.single("image"), async (req, res) => {
  try {
    const { name, category, product_type, rarity, basePrice, stock } = req.body;
    const variants = req.body.variants ? JSON.parse(req.body.variants) : [];

    // Validaciones
    if (!name || !category || !product_type || !rarity || !basePrice) {
      return res.status(400).json({
        status: "error",
        error: "name, category, product_type, rarity and basePrice are required",
      });
    }

    if (product_type !== "no_size" && variants.length === 0) {
      return res.status(400).json({
        status: "error",
        error: "Products with sizes must have at least one variant",
      });
    }

    if (product_type === "no_size" && !stock) {
      return res.status(400).json({
        status: "error",
        error: "No-size products must include a stock value",
      });
    }

    const imageUrl = await uploadImage(req.file);

    // 1. Crear el Product en Stripe
    const product = await stripe.products.create({
      name,
      images: imageUrl ? [imageUrl] : [],
      metadata: {
        category,
        product_type,
        rarity,
      },
    });

    // 2. Crear los Prices según el tipo de producto
    const prices = await createPrices(
      product.id,
      product_type,
      basePrice,
      variants,
      stock
    );

    res.status(201).json({
      status: "success",
      product: { ...product, prices },
    });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// ─── PUT /products/:id ─────────────────────────────────────────────────────
// Edita un producto existente: info básica, status e inventario por variante
app.put("/products/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, product_type, rarity, status } = req.body;
    const variants = req.body.variants ? JSON.parse(req.body.variants) : null;

    const imageUrl = await uploadImage(req.file);

    // Actualizar el Product en Stripe
    const updatedProduct = await stripe.products.update(id, {
      name,
      active: status === "active",
      ...(imageUrl && { images: [imageUrl] }),
      metadata: { category, product_type, rarity },
    });

    // Actualizar variantes existentes o crear nuevas si no tienen priceId
    if (variants && variants.length > 0) {
      await Promise.all(
        variants.map(async (variant) => {
          const desiredAmount = variant.priceOverride
            ? Math.round(parseFloat(variant.priceOverride) * 100)
            : Math.round(parseFloat(req.body.basePrice) * 100);

          if (variant.priceId) {
            // Stripe no permite cambiar unit_amount de un Price existente.
            // Si el precio cambió: desactivar el Price viejo y crear uno nuevo.
            if (variant.unit_amount && desiredAmount !== variant.unit_amount) {
              await stripe.prices.update(variant.priceId, { active: false });
              return stripe.prices.create({
                product: id,
                currency: "usd",
                unit_amount: desiredAmount,
                metadata: {
                  size: variant.size,
                  inventory_count: String(variant.inventory_count),
                  sku: variant.sku || "",
                },
              });
            }
            // Precio sin cambios → solo actualizar metadata
            return stripe.prices.update(variant.priceId, {
              metadata: {
                size: variant.size,
                inventory_count: String(variant.inventory_count),
                sku: variant.sku || "",
              },
            });
          } else {
            // Variante nueva → crear nuevo Price en Stripe
            return stripe.prices.create({
              product: id,
              currency: "usd",
              unit_amount: desiredAmount,
              metadata: {
                size: variant.size,
                inventory_count: String(variant.inventory_count),
                sku: variant.sku || "",
              },
            });
          }
        })
      );
    }

    res.json({ status: "success", product: updatedProduct });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// ─── DELETE /products/:id ──────────────────────────────────────────────────
// Soft delete: desactiva el producto en Stripe (no se elimina físicamente)
app.delete("/products/:id", async (req, res) => {
  try {
    const product = await stripe.products.update(req.params.id, {
      active: false,
    });
    res.json({ status: "success", product });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// ─── POST /webhooks/stripe ─────────────────────────────────────────────────
// Stripe llama aquí al completarse una compra → decrementa inventory_count
app.post("/webhooks/stripe", async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    return res.status(400).json({ error: `Webhook error: ${e.message}` });
  }

  if (event.type === "checkout.session.completed") {
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(
        event.data.object.id,
        { expand: ["data.price"] }
      );

      await Promise.all(
        lineItems.data.map(async (item) => {
          const price = item.price;
          const currentStock = parseInt(
            price.metadata.inventory_count || "0"
          );
          const newStock = Math.max(0, currentStock - item.quantity);

          await stripe.prices.update(price.id, {
            metadata: {
              ...price.metadata,
              inventory_count: String(newStock),
            },
          });
        })
      );
    } catch (e) {
      console.error("Error updating inventory:", e.message);
    }
  }

  res.json({ received: true });
});

app.listen(PORT, () =>
  console.log(`admin-store-service listening on port ${PORT}`)
);