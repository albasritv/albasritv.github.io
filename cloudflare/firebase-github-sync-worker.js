/**
 * BSR Admin -> Cloudflare Worker -> GitHub Actions
 *
 * Required Cloudflare Worker secrets:
 *   GITHUB_TOKEN : Fine-grained GitHub token with access to albasritv/albasritv.github.io
 *   SYNC_KEY     : Long random secret used only by the admin app
 *
 * POST /sync
 * Header: X-Sync-Key: <SYNC_KEY>
 *
 * This worker is called only after the ADMIN successfully saves data to Firebase.
 * End users never call this worker.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "bsr-firebase-github-sync" }, 200);
    }

    if (request.method !== "POST" || url.pathname !== "/sync") {
      return json({ ok: false, error: "not_found" }, 404);
    }

    const suppliedKey = request.headers.get("X-Sync-Key") || "";
    if (!suppliedKey || suppliedKey !== env.SYNC_KEY) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    if (!env.GITHUB_TOKEN) {
      return json({ ok: false, error: "missing_github_token" }, 500);
    }

    let body = {};
    try {
      body = await request.json();
    } catch (_) {}

    const allowedKinds = new Set([
      "catalog",
      "matches",
      "servers",
      "all"
    ]);

    const kind = allowedKinds.has(body.kind) ? body.kind : "all";

    const gh = await fetch(
      "https://api.github.com/repos/albasritv/albasritv.github.io/dispatches",
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "BSR-Admin-Sync"
        },
        body: JSON.stringify({
          event_type: "firebase_catalog_changed",
          client_payload: {
            kind,
            source: "admin",
            requested_at: new Date().toISOString()
          }
        })
      }
    );

    if (!gh.ok) {
      const details = await gh.text();
      return json({
        ok: false,
        error: "github_dispatch_failed",
        status: gh.status,
        details: details.slice(0, 500)
      }, 502);
    }

    return json({
      ok: true,
      triggered: true,
      kind
    }, 200);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
