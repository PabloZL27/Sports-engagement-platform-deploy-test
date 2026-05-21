const PROFILE_SERVICE_URL =
  process.env.PROFILE_SERVICE_URL || "http://icarus-profile:4006";

function getAuthorizationHeader(req) {
  const authHeader = req.headers.authorization;

  if (Array.isArray(authHeader)) {
    return authHeader[0] || null;
  }

  return authHeader || null;
}

async function getProfileByAuthToken(authorizationHeader) {
  const response = await fetch(`${PROFILE_SERVICE_URL}/me`, {
    headers: {
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error(`Profile lookup failed (${response.status})`), {
      status: response.status,
    });
  }

  const data = await response.json();

  if (!data?.profile) {
    throw new Error("Profile response missing profile payload");
  }

  return data.profile;
}

function parsePositiveIntegerAccountId(profile) {
  const raw = profile?.account_id;
  const parsed = Number.parseInt(String(raw), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error("Profile account_id is invalid");
  }

  return parsed;
}

async function resolveAccountIdFromRequest(req) {
  const authorizationHeader = getAuthorizationHeader(req);

  if (!authorizationHeader) {
    throw Object.assign(new Error("Authorization is required"), { status: 401 });
  }

  const profile = await getProfileByAuthToken(authorizationHeader);
  const accountId = parsePositiveIntegerAccountId(profile);

  return { authorizationHeader, accountId };
}

module.exports = {
  PROFILE_SERVICE_URL,
  getAuthorizationHeader,
  resolveAccountIdFromRequest,
  parsePositiveIntegerAccountId,
  getProfileByAuthToken,
};