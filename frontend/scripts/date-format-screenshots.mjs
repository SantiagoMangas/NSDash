import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..");

const sampleDate = "2026-03-09";

function oldVamHistoryFormat(iso) {
  return new Date(iso).toLocaleDateString("es-AR");
}

function oldStrengthLogFormat(iso) {
  return iso;
}

function formatDisplayDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const day = String(d).padStart(2, "0");
  const month = String(m).padStart(2, "0");
  return `${day}/${month}/${y}`;
}

function renderPage(mode) {
  const vamDate = mode === "before" ? oldVamHistoryFormat(sampleDate) : formatDisplayDate(sampleDate);
  const logDate = mode === "before" ? oldStrengthLogFormat(sampleDate) : formatDisplayDate(sampleDate);
  const title = mode === "before" ? "ANTES" : "DESPUÉS";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Inter, Segoe UI, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 16px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(15,23,42,.06); }
    h2 { font-size: 14px; margin: 0 0 12px; color: #334155; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    th { color: #64748b; font-size: 12px; font-weight: 600; }
    .log-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .muted { color: #94a3b8; width: 96px; }
    .badge { display: inline-block; background: ${mode === "before" ? "#fef3c7" : "#dcfce7"}; color: ${mode === "before" ? "#92400e" : "#166534"}; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .iso { color: #64748b; font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <span class="badge">${title}</span>
  <h1>Formato de fechas — ${title}</h1>
  <p class="iso">Fecha almacenada (ISO): ${sampleDate}</p>

  <div class="card">
    <h2>Historial de tests VAM</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Test</th><th>VAM</th></tr></thead>
      <tbody>
        <tr><td>${vamDate}</td><td>Test VAM 2000m</td><td>15.32 km/h</td></tr>
        <tr><td>${vamDate}</td><td>Test 30-15 IFT</td><td>17.50 km/h</td></tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Registros de entrenamiento (fuerza)</h2>
    <div class="log-row"><div><span class="muted">${logDate}</span> 100 kg × 5 reps</div><strong>116.7 kg RM</strong></div>
    <div class="log-row"><div><span class="muted">${logDate}</span> 95 kg × 6 reps</div><strong>114.0 kg RM</strong></div>
  </div>
</body>
</html>`;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 620 } });

  for (const mode of ["before", "after"]) {
    const html = renderPage(mode);
    const htmlPath = join(outDir, `date-format-${mode}.html`);
    writeFileSync(htmlPath, html, "utf8");
    await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`);
    await page.screenshot({ path: join(outDir, `date-format-${mode}.png`), fullPage: true });
  }

  await browser.close();
  console.log("Screenshots saved to", outDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
