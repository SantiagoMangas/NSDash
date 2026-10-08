import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "prod-rm-table-rir3");
mkdirSync(outDir, { recursive: true });

const FRONTEND = process.env.FRONTEND_URL ?? "https://ns-dash.vercel.app";
const API = process.env.API_URL ?? "https://ns-dash-production.up.railway.app";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/inicio", { timeout: 30000 });

  const loginRes = await page.request.post(`${API}/auth/login`, {
    data: { email: "admin@ns.com", password: "1234" },
  });
  const token = (await loginRes.json()).access_token;
  const headers = { Authorization: `Bearer ${token}` };

  const logs = await (await page.request.get(`${API}/logs`, { headers })).json();
  const log10 = logs.find((l) => l.reps === 10) ?? logs[0];
  const ex = log10.exercise_id;
  const atleta = log10.athlete_id;

  await page.goto(`${FRONTEND}/fuerza?atleta=${atleta}&ejercicio=${ex}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(2000);

  const rows = page.locator('button[aria-expanded]').filter({ hasText: /kg RM/ });
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const t = await rows.nth(i).innerText();
    if (t.includes("10 rep")) {
      await rows.nth(i).click();
      break;
    }
  }
  await page.waitForTimeout(2000);

  const table = page.getByTestId("percentage-rm-table");
  await table.waitFor({ timeout: 15000 });
  await table.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: join(outDir, "prod-tabla-10-reps-zebra.png"),
    fullPage: true,
  });
  await table.screenshot({ path: join(outDir, "prod-tabla-crop.png") });

  await browser.close();
  console.log("Captura en", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
