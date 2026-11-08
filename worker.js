// Cloudflare Worker: proxy de subida de imágenes a ImgBB.
// Variables necesarias (Settings → Variables and Secrets):
//   IMGBB_KEY       (Secret)  tu NUEVA clave de api.imgbb.com
//   ALLOWED_ORIGIN  (opcional) p. ej. https://tuusuario.github.io  (si no, acepta cualquiera)
//   ALLOWED_UIDS    (opcional) UIDs de Firebase permitidos, separados por comas (si no, cualquier admin con sesión)

const PROJECT_ID = "restaurante-5294c";
const JWK_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const MAX_BODY = 2 * 1024 * 1024; // 2 MB

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const decodeJson = (p) => JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));

async function verifyFirebaseToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("bad token");
  const header = decodeJson(parts[0]);
  const payload = decodeJson(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== "RS256") throw new Error("bad alg");
  if (payload.aud !== PROJECT_ID) throw new Error("bad aud");
  if (payload.iss !== "https://securetoken.google.com/" + PROJECT_ID) throw new Error("bad iss");
  if (!payload.sub || payload.exp <= now || payload.iat > now + 60) throw new Error("expired");

  const jwks = await (await fetch(JWK_URL, { cf: { cacheTtl: 3600, cacheEverything: true } })).json();
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown key");
  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) throw new Error("bad signature");
  return payload;
}

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ success: false, error: "method" }, 405);

    try {
      const auth = request.headers.get("Authorization") || "";
      if (!auth.startsWith("Bearer ")) return json({ success: false, error: "no auth" }, 401);
      const user = await verifyFirebaseToken(auth.slice(7));

      if (env.ALLOWED_UIDS) {
        const allowed = env.ALLOWED_UIDS.split(",").map((s) => s.trim());
        if (!allowed.includes(user.sub)) return json({ success: false, error: "forbidden" }, 403);
      }

      const raw = await request.text();
      if (raw.length > MAX_BODY) return json({ success: false, error: "too large" }, 413);
      const { image } = JSON.parse(raw);
      if (typeof image !== "string" || !image) return json({ success: false, error: "no image" }, 400);

      const form = new FormData();
      form.append("image", image);
      const res = await fetch("https://api.imgbb.com/1/upload?key=" + env.IMGBB_KEY, { method: "POST", body: form });
      const data = await res.json();
      return json(data, res.ok ? 200 : 502);
    } catch (e) {
      return json({ success: false, error: "unauthorized" }, 401);
    }
  },
};
