import { createSign } from "node:crypto";

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function getGoogleAccessToken(scope: string): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = base64url(signer.sign(privateKey));
  const assertion = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`No se pudo autenticar con Google: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function fetchSheetValues(
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const accessToken = await getGoogleAccessToken(
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  );

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`No se pudo leer la planilla: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}
