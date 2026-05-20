const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4016;
const COMMUNITY_SERVICE_URL =
  process.env.COMMUNITY_SERVICE_URL || "http://icarus-community:4001";
const PROFILE_SERVICE_URL = process.env.PROFILE_SERVICE_URL;
const STORE_SERVICE_URL = process.env.STORE_SERVICE_URL;
  

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

app.get("/", (req, res) => {
  res.json({
    service: "reports-service",
    status: "ok",
    endpoints: [
      "/health",
      "/reports/user/list-reports",
      "/reports/user/create-report",
      "/reports/user/edit-report",
      "/reports/user/delete-report",
      "/reports/user/count-critical",
      "/reports/user/count-pending",
      "/reports/user/count-banned"
    ],
  });
});

app.get("/health", async (req, res) => {
    res.json({
        service: "reports-service",
        status: "ok",
        profileServiceUrl: PROFILE_SERVICE_URL,
        communityServiceUrl: COMMUNITY_SERVICE_URL,
        storeServiceUrl: STORE_SERVICE_URL,
  });
});

app.get("/reports/user/list-reports", async (req, res) => {
  try {
    const totalReports = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/list-user-reports`,
    );

    res.json(totalReports);
  } catch (error) {
    console.error("reports service user reports lookup failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to fetch total-user-reports data",
      details: error.message,
    });
  }
});

app.get("/reports/user/count-critical", async (req, res) => {
  try {
    const data = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/count-critical-user-reports`
    );

    res.json(data);
  } catch (error) {
    console.error("reports service critical reports count failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to fetch critical user reports count",
      details: error.message,
    });
  }
});

app.get("/reports/user/count-pending", async (req, res) => {
  try {
    const data = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/count-pending-user-reports`
    );

    res.json(data);
  } catch (error) {
    console.error("reports service pending reports count failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to fetch pending user reports count",
      details: error.message,
    });
  }
});

app.get("/reports/user/count-banned", async (req, res) => {
  try {
    const data = await fetchJson(
      `${PROFILE_SERVICE_URL}/reports/count-banned-users`
    );

    res.json(data);
  } catch (error) {
    console.error("reports service banned users count failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to fetch banned users count",
      details: error.message,
    });
  }
});
// DONE
app.post("/reports/user/create-report", async (req, res) => {
  try {
    const { user_id, reported_by_user_id, reason, content } = req.body;

    const result = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/create-user-report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, reported_by_user_id, reason, content }),
      }
    );

    res.json(result);
  } catch (error) {
    console.error("reports service create report failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to create user report",
      details: error.message,
    });
  }
});
//DONE
app.patch("/reports/user/edit-report", async (req, res) => {
  try {
    const { report_id, status, resolved_type } = req.body;

    const result = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/edit-user-report`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id, status, resolved_type }),
      }
    );

    res.json(result);
  } catch (error) {
    console.error("reports service edit report failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to edit user report",
      details: error.message,
    });
  }
});
//DONE
app.delete("/reports/user/delete-report", async (req, res) => {
  try {
    const { report_id } = req.body;

    const result = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/delete-user-report?report_id=${report_id}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    res.json(result);
  } catch (error) {
    console.error("reports service delete report failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to delete user report",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`reports-service listening on port ${PORT}`);
});
