/**
 * GET /docs
 *
 * Menyajikan Scalar API Reference yang interaktif, modern, dan lengkap
 * berdasarkan spesifikasi OpenAPI CiviGo di /api/openapi.json.
 */
export async function GET() {
  const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CiviGo — Dokumentasi API Resmi (Scalar)</title>
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <meta name="description" content="Dokumentasi interaktif REST API CiviGo untuk antrean publik, katalog layanan, cross-agency discovery, analitik, dan AI assistant." />
    <style>
      body {
        margin: 0;
        padding: 0;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        background-color: #0b0f19;
      }
      /* Custom Scalar Header Branding */
      .scalar-custom-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 48px;
        background: #111827;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        z-index: 9999;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .scalar-custom-header a {
        color: #818cf8;
        text-decoration: none;
        margin-left: 16px;
      }
      .scalar-custom-header a:hover {
        text-decoration: underline;
      }
      #api-reference-container {
        position: absolute;
        top: 48px;
        bottom: 0;
        left: 0;
        right: 0;
        overflow: auto;
      }
    </style>
  </head>
  <body>
    <header class="scalar-custom-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 700; color: #a5b4fc; font-size: 14px;">⚡ CiviGo API Docs</span>
        <span style="background: rgba(99, 102, 241, 0.2); color: #c7d2fe; padding: 2px 8px; border-radius: 999px; font-size: 11px;">v1.0.0</span>
      </div>
      <div>
        <a href="/" target="_blank">Beranda Dashboard</a>
        <a href="/api/openapi.json" target="_blank" style="color: #94a3b8;">Raw OpenAPI JSON</a>
      </div>
    </header>

    <div id="api-reference-container">
      <script
        id="api-reference"
        type="application/json"
        data-url="/api/openapi.json"
        data-configuration='{
          "theme": "purple",
          "layout": "modern",
          "showSidebar": true,
          "searchHotKey": "k",
          "darkMode": true,
          "hideModels": false,
          "metaData": {
            "title": "CiviGo API Docs"
          }
        }'
      ></script>
      <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    </div>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
