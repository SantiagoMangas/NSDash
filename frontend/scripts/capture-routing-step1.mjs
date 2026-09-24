import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "routing-step1");
mkdirSync(outDir, { recursive: true });

const FRONTEND = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector("#email", { timeout: 20000 });
  await page.screenshot({ path: join(outDir, "01-login.png"), fullPage: true });

  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/atletas", { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, "02-header-atletas.png"), fullPage: true });

  await page.getByRole("link", { name: "Equipos" }).click();
  await page.waitForURL("**/equipos", { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, "03-header-equipos.png"), fullPage: true });

  await browser.close();
  console.log("Capturas en", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
