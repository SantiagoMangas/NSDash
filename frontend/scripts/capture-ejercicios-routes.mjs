import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "ejercicios-routes");
mkdirSync(outDir, { recursive: true });

const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000";

async function login(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/inicio", { timeout: 25000 });
  await page.waitForTimeout(600);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await login(page);

  await page.getByRole("link", { name: "Ejercicios" }).click();
  await page.waitForURL("**/ejercicios", { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, "01-lista-agrupada.png"), fullPage: true });

  const verFuerza = page.getByRole("link", { name: "Ver en Fuerza" }).first();
  await verFuerza.click();
  await page.waitForURL("**/fuerza?ejercicio=*", { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outDir, "02-fuerza-deep-link-ejercicio.png"), fullPage: true });

  const url = page.url();
  console.log("Deep-link URL:", url);

  await browser.close();
  console.log("Capturas en", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
