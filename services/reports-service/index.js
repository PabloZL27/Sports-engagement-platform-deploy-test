const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4016;
const COMMUNITY_SERVICE_URL =
  process.env.COMMUNITY_SERVICE_URL || "http://icarus-community:4001";

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}


async function sendJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

app.get("/", (req, res) => {
  res.json({
    service: "reports-service",
    status: "ok",
    endpoints: [
      "/health",
    ],
  });
});

app.get("/health", (req, res) => {
  res.json({
    service: "reports-service",
    status: "ok",
    communityServiceUrl: COMMUNITY_SERVICE_URL,
  });
});

app.get("/reports/list-community-reports", async (req, res) => {
  try {
    const listReports = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/list-community-reports`,
    );

    res.json(listReports);
  } catch (error) {
    console.error("reports-service total-posts lookup failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to fetch list-community-reports",
      details: error.message,
    });
  }
});

app.get("/reports/count-critical-reports", async (req, res) => {
  try {
    const criticalReports = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/count-critical-reports`,
    );

    res.json(criticalReports);
  } catch (error) {
    console.error("reports-service count-critical-reports lookup failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to fetch count-critical-reports",
      details: error.message,
    });
  }
});

app.get("/reports/count-pending-reports", async (req, res) => {
  try {
    const pendingReports = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/count-pending-reports`,
    );

    res.json(pendingReports);
  } catch (error) {
    console.error("reports-service count-pending-reports lookup failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to fetch count-pending-reports",
      details: error.message,
    });
  }
});

app.get("/reports/count-resolved-this-month", async (req, res) => {
  try {
    const resolvedReports = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/count-resolved-this-month`,
    );

    res.json(resolvedReports);
  } catch (error) {
    console.error("reports-service count-resolved-this-month lookup failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to fetch count-resolved-this-month",
      details: error.message,
    });
  }
});

app.post("/reports/create-post-report", async (req, res) => {
  try {
    const reportResult = await sendJson(
      `${COMMUNITY_SERVICE_URL}/reports/create-post-report`,
      "POST",
      req.body,
    );

    res.status(reportResult.status).json(reportResult.data);
  } catch (error) {
    console.error("reports-service create-post-report lookup failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to create post report",
      details: error.message,
    });
  }
});

app.patch("/reports/moderate-report", async (req, res) => {
  try {
    const moderationResult = await sendJson(
      `${COMMUNITY_SERVICE_URL}/reports/moderate-report`,
      "PATCH",
      req.body,
    );

    res.status(moderationResult.status).json(moderationResult.data);
  } catch (error) {
    console.error("reports-service moderate-report lookup failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to moderate report",
      details: error.message,
    });
  }
});


app.listen(PORT, () => {
  console.log(`reports-service listening on port ${PORT}`);
});
