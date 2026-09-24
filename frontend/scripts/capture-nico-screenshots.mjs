import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots");
mkdirSync(outDir, { recursive: true });

const FRONTEND = "http://localhost:3000";
const API = "http://127.0.0.1:8000";

async function getToken() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ns.com", password: "1234" }),
  });
  const data = await res.json();
  return data.access_token;
}

async function loginAndSelectAthlete(page, athleteName) {
  await page.goto(FRONTEND, { waitUntil: "networkidle" });

  const email = page.locator("#email");
  if (await email.isVisible().catch(() => false)) {
    await email.fill("admin@ns.com");
    await page.locator("#password").fill("1234");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await page.waitForTimeout(2500);
  }

  await page.waitForSelector("text=NSDash", { timeout: 20000 });
  const logoutVisible = await page.getByRole("button", { name: /Cerrar sesión/i }).isVisible().catch(() => false);
  if (!logoutVisible) {
    await page.screenshot({ path: join(outDir, "debug-login-failed.png"), fullPage: true });
    throw new Error("Login no completó — ver debug-login-failed.png");
  }
  await page.getByRole("button", { name: /Velocidad y Resistencia/i }).click();
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: athleteName, exact: true }).click();
  await page.waitForTimeout(1500);
  await page.getByText("Evaluaciones").first().waitFor({ state: "visible", timeout: 20000 });
}

async function openAccordion(page, title) {
  const button = page.locator("button", { hasText: title }).first();
  await button.waitFor({ state: "visible", timeout: 20000 });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await page.waitForTimeout(600);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // 1) VAM 2000m + 5min forms (Lucas Fernández — demo resistencia)
  await loginAndSelectAthlete(page, "Lucas Fernández");
  await openAccordion(page, "VAM 2000 m");
  await page.locator('input[aria-label="Minutos"]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(outDir, "01-vam-2000m-min-seg.png") });

  await openAccordion(page, "VAM 5 minutos");
  await page.locator('input[aria-label="Minutos"]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(outDir, "02-vam-5min-min-seg.png") });

  // 2) Historial con fecha DD/MM/AAAA (demo Lucas — ej. 13/08/2026)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  const historyHeading = page.getByRole("heading", { name: "Historial de Tests VAM" });
  await historyHeading.waitFor({ state: "visible", timeout: 20000 });
  await historyHeading.scrollIntoViewIfNeeded();
  const historyCard = historyHeading.locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]");
  await historyCard.screenshot({ path: join(outDir, "03-vam-historial-fecha-ddmm.png") });

  // 3) Speed test form — Martín González (demo speed tests)
  await loginAndSelectAthlete(page, "Martín González");
  await openAccordion(page, "Test de Velocidad");
  await page.getByText("Velocidad Pico (km/h)", { exact: false }).waitFor({ state: "visible" });
  const picoField = page.locator("#speed-test-pico");
  await picoField.scrollIntoViewIfNeeded();
  const clipBox = await picoField.evaluate((el) => {
    const card = el.closest("form");
    const rect = (card ?? el).getBoundingClientRect();
    return { x: Math.max(0, rect.x - 16), y: Math.max(0, rect.y - 120), width: rect.width + 32, height: rect.height + 200 };
  });
  await page.screenshot({ path: join(outDir, "04-speed-test-promedio-pico.png"), clip: clipBox });

  await browser.close();
  console.log("Capturas guardadas en", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
