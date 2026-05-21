require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4005

const pool = new Pool({
    connectionString: process.env.STORE_DB_URL
});

app.get("/", async (req, res) => {
    res.send('Hello from the store');
});

app.get("/health", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS now"
        );
        res.json({
            service: "store-service",
            status: "ok",
            db: "connected",
            time: result.rows[0].now
        });
    } catch (error) {
        res.status(500).json({
            service: "store-service",
            status: "error",
            db: "disconnected",
            error: error.message
        });
    }
});

app.post("/create_checkout", async (req, res) => {
  try {
    const { line_items, origin } = req.body;

    // Usa el origin del cliente si viene, sino FRONTEND_URL del .env
    const baseUrl = origin || process.env.FRONTEND_URL || "http://localhost:5173";

    // Validar que line_items sea un array con al menos un elemento
    if (!Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({
        status: "error",
        error: "line_items must be a non-empty array"
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: line_items,
      success_url: `${baseUrl}/paySuccess`,
      cancel_url: `${baseUrl}/store`,
    });

    res.status(200).json({ 
      status: "success",
      url: session.url 
    });

  } catch (e) {
    res.status(500).json({
      status: "error", 
      error: e.message 
    });
  }
});

async function resolveDefaultPriceForProduct(stripe, product) {
  let price = product.default_price;

  if (typeof price === "string" && price.startsWith("price_")) {
    price = await stripe.prices.retrieve(price);
  }

  const usableAmount =
    price &&
    typeof price === "object" &&
    (typeof price.unit_amount === "number" ||
      typeof price.unit_amount_decimal === "string");

  if (!usableAmount) {
    const listed = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    });
    price =
      listed.data.find(
        (pr) =>
          typeof pr.unit_amount === "number" ||
          typeof pr.unit_amount_decimal === "string"
      ) ||
      listed.data[0] ||
      null;
  }

  return price;
}

app.get("/get_products", async (req, res) => {
  try {
    const list = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ["data.default_price"],
    });

    const products = [];

    for (const raw of list.data) {
      const resolvedPrice = await resolveDefaultPriceForProduct(stripe, raw);

      const plainProduct =
        typeof raw.toJSON === "function"
          ? raw.toJSON()
          : JSON.parse(JSON.stringify(raw));

      plainProduct.default_price = resolvedPrice
        ? typeof resolvedPrice.toJSON === "function"
          ? resolvedPrice.toJSON()
          : resolvedPrice
        : null;

      products.push(plainProduct);
    }

    res.status(200).json({
      status: "success",
      products,
    });
  } catch (e) {
    res.status(500).json({
      status: "error",
      error: e.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`store-service listening on port ${PORT}`);
});