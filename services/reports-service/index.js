const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4015;
const COMMUNITY_SERVICE_URL =
  process.env.COMMUNITY_SERVICE_URL || "http://icarus-community:4001";
  

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

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
      "/reports/user/list-reports",
      "/reports/user/create-report",
      "/reports/user/edit-report",
      "/reports/user/delete-report"
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

//read
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

//create
app.post("/reports/user/create-report", async (req, res) => {
  try {
    const { user_id, reason, content } = req.body;

    const result = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/create-user-report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, reason, content }),
      }
    );

    res.json(result);
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
//update
app.patch("/reports/user/edit-report", async (req, res) => {
  try {
    const { report_id, status } = req.body;

    const result = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/edit-user-report`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id, status }),
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

//delete
app.delete("/reports/user/delete-report", async (req, res) => {
  try {
    const { report_id } = req.body;

    const result = await fetchJson(
      `${COMMUNITY_SERVICE_URL}/reports/delete-user-report`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id }),
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
