const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4015;
const PROFILE_SERVICE_URL =
  process.env.PROFILE_SERVICE_URL || "http://icarus-profile:4006";
const COMMUNITY_SERVICE_URL =
  process.env.COMMUNITY_SERVICE_URL || "http://icarus-community:4001";
const STORE_SERVICE_URL =
  process.env.STORE_SERVICE_URL || "http://icarus-store:4005";

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

app.get("/", (req, res) => {
  res.json({
    service: "dashboard-service",
    status: "ok",
    endpoints: [
      "/health",
      "/stats/members-per-month",
      "/stats/new-accounts",
      "/stats/total-members",
      "/stats/posts-per-day",
      "/stats/posts-by-category",
      "/stats/total-posts",
      "/stats/total-products",
      "/top_contributors",
      "/get_products",
    ],
  });
});

app.get("/health", (req, res) => {
  res.json({
    service: "dashboard-service",
    status: "ok",
    profileServiceUrl: PROFILE_SERVICE_URL,
    communityServiceUrl: COMMUNITY_SERVICE_URL,
    storeServiceUrl: STORE_SERVICE_URL,
  });
});

app.get("/stats/members-per-month", async (req, res) => {
  try {
    const membersPerMonth = await fetchJson(
      `${PROFILE_SERVICE_URL}/stats/members-per-month`,
    );

    res.json(membersPerMonth);
  } catch (error) {
    console.error("dashboard-service members-per-month lookup failed:", error);
    res.status(502).json({
      service: "dashboard-service",
      status: "error",
      error: "Unable to fetch members-per-month data",
      details: error.message,
    });
  }
});

app.get("/stats/new-accounts", async (req, res) => {
  try {
    const newAccounts = await fetchJson(
      `${PROFILE_SERVICE_URL}/stats/new-accounts`,
    );

    res.json(newAccounts);
  } catch (error) {
    console.error("dashboard-service new-accounts lookup failed:", error);
    res.status(502).json({
      service: "dashboard-service",
      status: "error",
      error: "Unable to fetch new-accounts data",
      details: error.message,
    });
  }
});

app.get("/stats/total-members", async (req, res) => {
  try {
    const totalMembers = await fetchJson(
      `${PROFILE_SERVICE_URL}/stats/total-members`,
    );

    res.json(totalMembers);
  } catch (error) {
    console.error("dashboard-service total-members lookup failed:", error);
    res.status(502).json({
      service: "dashboard-service",
      status: "error",
      error: "Unable to fetch total-members data",
      details: error.message,
    });
  }
});

app.get("/stats/posts-per-day", async (req, res) => {
  try {
    const postsPerDay = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/stats/posts-per-day`,
    );

    res.json(postsPerDay);
  } catch (error) {
    console.error("dashboard-service posts-per-day lookup failed:", error);
    res.status(502).json({
      service: "dashboard-service",
      status: "error",
      error: "Unable to fetch posts-per-day data",
      details: error.message,
    });
  }
});

app.get("/stats/posts-by-category", async (req, res) => {
  try {
    const postsByCategory = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/stats/posts-by-category`,
    );

    res.json(postsByCategory);
  } catch (error) {
    console.error("dashboard-service posts-by-category lookup failed:", error);
    res.status(502).json({
      service: "dashboard-service",
      status: "error",
      error: "Unable to fetch posts-by-category data",
      details: error.message,
    });
  }
});

app.get("/stats/total-posts", async (req, res) => {
  try {
    const totalPosts = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/stats/total-posts`,
    );

    res.json(totalPosts);
  } catch (error) {
    console.error("dashboard-service total-posts lookup failed:", error);
    res.status(502).json({
      service: "dashboard-service",
      status: "error",
      error: "Unable to fetch total-posts data",
      details: error.message,
    });
  }
});

app.get("/top_contributors", async (req, res) => {
  try {
    const topContributors = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/top_contributors`,
    );

    res.json(topContributors);
  } catch (error) {
    console.error("dashboard-service top_contributors lookup failed:", error);
    res.status(502).json({
      service: "dashboard-service",
      status: "error",
      error: "Unable to fetch top contributors data",
      details: error.message,
    });
  }
});

app.get("/stats/total-products", async (req, res) => {
  try {
    const data = await fetchJson(`${STORE_SERVICE_URL}/get_products`);
    const products = Array.isArray(data.products) ? data.products : [];

    res.json({
      total_products: products.length,
      trend: products.length > 0 ? "green" : "gray",
    });
  } catch (error) {
    console.error("dashboard-service total-products lookup failed:", error);
    res.status(502).json({
      service: "dashboard-service",
      status: "error",
      error: "Unable to fetch total-products data",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`dashboard-service listening on port ${PORT}`);
});
