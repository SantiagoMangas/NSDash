import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "date-format-routes");
mkdirSync(outDir, { recursive: true });

const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000";
const SAMPLE_ISO = "2026-11-05";
const SAMPLE_DISPLAY = "05/11/2026";

async function login(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/inicio", { timeout: 25000 });
  await page.waitForTimeout(600);
}

function beforeHtml() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8" />
<style>
body{font-family:Inter,Segoe UI,sans-serif;background:#f8fafc;padding:24px;color:#0f172a}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;max-width:420px}
h1{font-size:16px;margin:0 0 12px}
.badge{background:#fef3c7;color:#92400e;display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:12px}
.input{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;width:100%;font-size:14px}
.label{font-size:12px;color:#64748b;margin-bottom:4px;display:block}
.muted{font-size:12px;color:#94a3b8;margin-top:8px}
</style></head><body>
<span class="badge">ANTES</span>
<h1>Input nativo (locale del navegador)</h1>
<div class="card">
<label class="label">Fecha de nacimiento</label>
<input class="input" value="11/05/2026" readonly aria-label="ejemplo formato US" />
<p class="muted">ISO almacenado: ${SAMPLE_ISO} — el usuario ve 11/05 (mes/día ambiguo)</p>
</div>
</body></html>`;
}

function afterHtml() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8" />
<style>
body{font-family:Inter,Segoe UI,sans-serif;background:#f8fafc;padding:24px;color:#0f172a}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;max-width:420px}
h1{font-size:16px;margin:0 0 12px}
.badge{background:#dcfce7;color:#166534;display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:12px}
.input{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;width:100%;font-size:14px}
.label{font-size:12px;color:#64748b;margin-bottom:4px;display:block}
.hint{font-size:12px;color:#64748b;margin-top:8px}
.hint strong{color:#334155}
</style></head><body>
<span class="badge">DESPUÉS</span>
<h1>formatDisplayDate() visible</h1>
<div class="card">
<label class="label">Fecha de nacimiento</label>
<input class="input" type="date" value="${SAMPLE_ISO}" />
<p class="hint">Fecha seleccionada: <strong>${SAMPLE_DISPLAY}</strong></p>
</div>
</body></html>`;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 520 } });

  await page.setContent(beforeHtml(), { waitUntil: "load" });
  await page.screenshot({ path: join(outDir, "01-antes-input-nativo.png") });

  await page.setContent(afterHtml(), { waitUntil: "load" });
  await page.screenshot({ path: join(outDir, "02-despues-formatDisplayDate.png") });

  try {
    await login(page);
    await page.goto(`${FRONTEND}/atletas`, { waitUntil: "networkidle" });
    const editBtn = page.getByRole("button", { name: /Editar ficha/i }).first();
    if (await editBtn.count()) {
      await editBtn.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible", timeout: 8000 });
      const birth = dialog.locator('input[type="date"]').first();
      await birth.fill(SAMPLE_ISO);
      await page.waitForTimeout(400);
      await page.screenshot({
        path: join(outDir, "03-modal-editar-fecha-05112026.png"),
        fullPage: true,
      });
    }

    await page.goto(`${FRONTEND}/fuerza`, { waitUntil: "networkidle" });
    const select = page.locator("#module-athlete-select");
    if (await select.count()) {
      const options = await select.locator("option").all();
      for (const opt of options) {
        const val = await opt.getAttribute("value");
        if (val && val !== "") {
          await select.selectOption(val);
          break;
        }
      }
      await page.waitForTimeout(1200);
      const exerciseBtn = page.getByRole("button", { name: /Sentadilla|Peso muerto|Press/i }).first();
      if (await exerciseBtn.count()) {
        await exerciseBtn.click();
        await page.waitForTimeout(800);
      }
      const logDate = page.locator("#log-date");
      if (await logDate.count()) {
        await logDate.fill(SAMPLE_ISO);
        await page.waitForTimeout(400);
        await page.screenshot({
          path: join(outDir, "04-fuerza-nuevo-registro-05112026.png"),
          fullPage: true,
        });
      }
    }
  } catch (err) {
    console.warn("Capturas en app (opcional):", err.message);
  }

  await browser.close();
  console.log("Capturas en", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
