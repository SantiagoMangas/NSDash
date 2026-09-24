import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "equipos-routes");
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

async function login(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/atletas", { timeout: 25000 });
}

async function main() {
  const token = await getToken();
  const teamsRes = await fetch(`${API}/teams`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const teams = await teamsRes.json();
  const teamId = teams[0]?.id;
  if (!teamId) throw new Error("No teams for screenshots");

  const descriptions = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await login(page);
  await page.getByRole("link", { name: "Equipos" }).click();
  await page.waitForURL("**/equipos", { timeout: 10000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, "01-lista-equipos.png"), fullPage: true });
  descriptions.push({
    file: "01-lista-equipos.png",
    text:
      "/equipos: grid de cards con imagen/inicial y nombre, botón + Agregar equipo; sin placeholder.",
  });

  await page.goto(`${FRONTEND}/equipos/${teamId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.locator("text=Tabla Nacional").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, "02-plantel-tabla-nacional.png"), fullPage: true });
  descriptions.push({
    file: "02-plantel-tabla-nacional.png",
    text:
      `/equipos/${teamId}: cabecera del equipo, lista de atletas del plantel y Tabla Nacional siempre visible abajo (filtro por team_id).`,
  });

  await page.goto(`${FRONTEND}/atletas`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ver ficha completa" }).first().click();
  await page.waitForURL("**/atletas/**/fuerza", { timeout: 15000 });
  await page.locator('a[href$="/resistencia"]').click();
  await page.waitForURL("**/resistencia", { timeout: 10000 });
  await page.waitForTimeout(1200);
  const hasNationalTable = await page.locator("text=Tabla Nacional").isVisible().catch(() => false);
  await page.screenshot({ path: join(outDir, "03-atleta-resistencia-sin-tabla.png"), fullPage: true });
  descriptions.push({
    file: "03-atleta-resistencia-sin-tabla.png",
    text:
      `/atletas/[id]/resistencia: ficha + tab Resistencia con módulo de evaluaciones/historial; Tabla Nacional NO presente` +
      (hasNationalTable ? " (¡ATENCIÓN: aún visible!)" : " (confirmado)."),
  });

  writeFileSync(
    join(outDir, "DESCRIPCIONES.md"),
    descriptions.map((d) => `## ${d.file}\n\n${d.text}\n`).join("\n"),
    "utf8",
  );

  await browser.close();
  console.log("Capturas en", outDir);
  if (hasNationalTable) {
    console.error("WARN: Tabla Nacional visible en resistencia del atleta");
    process.exitCode = 1;
  }
  for (const d of descriptions) console.log(`- ${d.file}: ${d.text}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
