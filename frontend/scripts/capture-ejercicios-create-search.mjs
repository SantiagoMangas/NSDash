import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "ejercicios-routes");
mkdirSync(outDir, { recursive: true });

const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000";
const TEST_NAME = "Demo Busqueda NSDash";

async function login(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/inicio", { timeout: 25000 });
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await login(page);
  await page.getByRole("link", { name: "Ejercicios" }).click();
  await page.waitForURL("**/ejercicios", { timeout: 15000 });

  await page.getByRole("button", { name: "+ Agregar ejercicio" }).click();
  await page.locator("#exercise-name").fill(TEST_NAME);
  await page.locator("#exercise-formula").selectOption("epley");
  await page.locator("#exercise-coef").fill("0.02");
  await page.locator("#exercise-curve").selectOption("banco_plano");
  await page.getByRole("button", { name: "Crear ejercicio" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(outDir, "03-ejercicio-creado-seccion.png"),
    fullPage: true,
  });

  await page.locator("#exercise-search").fill("demo busqueda");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(outDir, "04-buscador-ejercicios.png"),
    fullPage: true,
  });

  await page.getByRole("link", { name: "💪 Fuerza" }).click();
  await page.waitForURL("**/fuerza**", { timeout: 15000 });
  await page.getByPlaceholder("Buscar ejercicio…").fill("sentadilla back");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(outDir, "05-buscador-fuerza-chips.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("Capturas en", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
