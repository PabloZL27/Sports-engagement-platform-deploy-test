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
      "/reports/user/count-banned",
      "/reports/user/ban-user"
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

app.patch("/reports/user/ban-user", async (req, res) => {
  try {
    const data = await fetchJson(
      `${PROFILE_SERVICE_URL}/reports/ban-user`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
        },
        body: JSON.stringify(req.body),
      }
    );

    res.json(data);
  } catch (error) {
    console.error("reports service ban user failed:", error);
    res.status(502).json({
      service: "reports-service",
      status: "error",
      error: "Unable to ban user",
      details: error.message,
    });
  }
});
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
