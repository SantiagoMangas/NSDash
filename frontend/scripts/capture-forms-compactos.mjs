import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "forms-compactos");
mkdirSync(outDir, { recursive: true });

const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000";
const WIDTHS = [
  { name: "375", width: 375, height: 900 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];

const FORMS = [
  { value: "speed_test", slug: "velocidad", title: "Test de velocidad" },
  { value: "yoyo_ri1", slug: "yoyo", title: "Yo-Yo Test RI1" },
  { value: "test_30_15_ift", slug: "30-15", title: "30-15 IFT" },
];

async function login(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/inicio", { timeout: 25000 });
  await page.waitForTimeout(400);
}

async function selectAthlete(page) {
  const sel = page.locator("#module-athlete-select");
  await sel.waitFor({ state: "visible", timeout: 20000 });
  const options = await sel.locator("option").evaluateAll((els) =>
    els.map((o) => ({ value: o.value, text: o.textContent ?? "" })),
  );
  const pick = options.find((o) => o.value && o.value !== "");
  if (!pick) throw new Error("No athletes in module-athlete-select");
  await sel.selectOption(pick.value);
  await page.waitForTimeout(1000);
}

async function openForm(page, formValue) {
  await page.goto(`${FRONTEND}/resistencia`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await selectAthlete(page);
  const picker = page.locator("#evaluation-picker");
  await picker.waitFor({ state: "visible", timeout: 20000 });
  await picker.scrollIntoViewIfNeeded();
  await picker.selectOption(formValue);
  await page.waitForTimeout(600);
}

function formPanel(page, title) {
  return page.locator("div.mt-4.rounded-xl.border.border-slate-200").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

async function seedDemoFields(page, formValue) {
  if (formValue === "speed_test") {
    await page.locator("#speed-test-distancia").fill("30");
    await page.locator("#speed-test-tiempo").fill("4.2");
  }
  if (formValue === "yoyo_ri1") {
    const panel = formPanel(page, "Yo-Yo Test RI1");
    const nums = panel.locator('input[type="number"]');
    await nums.nth(0).fill("12");
    await nums.nth(1).fill("14.5");
  }
  if (formValue === "test_30_15_ift") {
    const panel = formPanel(page, "30-15 IFT");
    await panel.locator('input[type="number"]').first().fill("18.2");
  }
  await page.waitForTimeout(200);
}

async function main() {
  const browser = await chromium.launch();
  for (const form of FORMS) {
    for (const vp of WIDTHS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await login(page);
      await openForm(page, form.value);
      const panel = formPanel(page, form.title);
      await panel.waitFor({ state: "visible", timeout: 15000 });
      await seedDemoFields(page, form.value);
      await panel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const path = join(outDir, `${form.slug}-${vp.name}px.png`);
      await panel.screenshot({ path });
      await page.close();
      console.log("wrote", path);
    }
  }
  await browser.close();
  console.log("Done:", outDir);
}

async function capturePreviewComparison() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
  const html = `<!DOCTYPE html><html><head><meta charset=utf-8>
  <script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-100 p-6 font-sans">
  <h1 class="text-sm font-bold text-slate-800 mb-4">Test de velocidad — bloque de preview (línea eliminada marcada)</h1>
  <div class="grid md:grid-cols-2 gap-4">
  <div>
  <p class="text-xs font-semibold text-red-700 mb-2">ANTES</p>
  <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
    <p class="text-xs font-medium uppercase tracking-wide text-indigo-700">Vista previa del resultado</p>
    <div class="mt-2 flex flex-wrap items-baseline gap-6">
      <p class="text-2xl font-semibold text-indigo-900">25.71 <span class="text-base font-medium">km/h</span></p>
      <p class="text-lg font-semibold text-indigo-900">2:20 /km</p>
    </div>
    <p class="mt-2 text-xs text-indigo-800/90 ring-2 ring-red-500 ring-offset-2 rounded px-1 inline-block">
      Promedio: 30 m ÷ 4,2 s × 3,6 ← eliminado
    </p>
  </div></div>
  <div>
  <p class="text-xs font-semibold text-emerald-700 mb-2">DESPUÉS (rama actual)</p>
  <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
    <p class="text-xs font-medium uppercase tracking-wide text-indigo-700">Velocidad promedio calculada</p>
    <div class="mt-1 flex flex-wrap items-baseline gap-4">
      <p class="text-xl font-semibold text-indigo-900">25.71 <span class="text-sm font-medium">km/h</span></p>
      <p class="text-base font-semibold text-indigo-900">2:20 /km</p>
    </div>
  </div></div></div></body></html>`;
  await page.setContent(html, { waitUntil: "networkidle" });
  const path = join(outDir, "velocidad-preview-antes-despues.png");
  await page.screenshot({ path, fullPage: true });
  await browser.close();
  console.log("wrote", path);
}

async function runAll() {
  await main();
  await capturePreviewComparison();
}

runAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
