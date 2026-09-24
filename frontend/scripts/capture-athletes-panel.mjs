import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "athletes-panel");
mkdirSync(outDir, { recursive: true });

const FRONTEND = "http://localhost:3000";
const API = "http://127.0.0.1:8000";

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function getToken() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ns.com", password: "1234" }),
  });
  const data = await res.json();
  return data.access_token;
}

async function login(page) {
  await page.goto(FRONTEND, { waitUntil: "networkidle" });
  const email = page.locator("#email");
  if (await email.isVisible().catch(() => false)) {
    await email.fill("admin@ns.com");
    await page.locator("#password").fill("1234");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await page.waitForTimeout(2500);
  }
  await page.getByRole("button", { name: /Cerrar sesión/i }).waitFor({ state: "visible", timeout: 20000 });
}

async function main() {
  const token = await getToken();
  const team = await api(token, "POST", "/teams", {
    name: "Plantel Demo Capturas",
    image_url: "https://placehold.co/64x64/indigo/white?text=PD",
  });
  const athletes = await api(token, "GET", "/athletes");
  for (const athlete of athletes.slice(0, 4)) {
    await api(token, "PATCH", `/athletes/${athlete.id}`, { team_id: team.id });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await login(page);

  await page.locator("#team-filter").waitFor({ state: "visible" });
  await page.screenshot({ path: join(outDir, "01-lista-todos-equipos.png"), fullPage: true });

  await page.locator("#team-filter").selectOption(String(team.id));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outDir, "02-lista-filtrada-equipo.png"), fullPage: true });

  const firstLupa = page.getByRole("button", { name: "Ver ficha completa" }).first();
  await firstLupa.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outDir, "03-ficha-accordion.png"), fullPage: true });
  await firstLupa.click();
  await page.waitForTimeout(400);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "+ Agregar equipo", exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "+ Agregar equipo", exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, "04-agregar-equipo.png"), fullPage: true });
  await page.getByRole("button", { name: "Cancelar equipo", exact: true }).click();

  await page.getByRole("button", { name: "+ Agregar atleta", exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "+ Agregar atleta", exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, "05-agregar-atleta-form.png"), fullPage: true });

  await page.locator("#team-filter").selectOption(String(team.id));
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Velocidad y Resistencia" }).click();
  await page.waitForTimeout(1500);
  await page.getByText("Tabla Nacional").waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({ path: join(outDir, "06-tabla-nacional-vista-equipo.png"), fullPage: true });

  await page.locator("#team-filter").selectOption("");
  await page.waitForTimeout(800);
  const tablaVisible = await page.getByText("Tabla Nacional").isVisible().catch(() => false);
  await page.screenshot({
    path: join(outDir, `07-sin-tabla-todos-equipos${tablaVisible ? "-unexpected" : ""}.png`),
    fullPage: true,
  });

  await browser.close();
  console.log("Capturas en", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
