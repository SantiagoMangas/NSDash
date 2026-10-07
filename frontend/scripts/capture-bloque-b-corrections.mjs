import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "bloque-b-correcciones");
mkdirSync(outDir, { recursive: true });

const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8000";

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
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await login(page);

  const loginRes = await page.request.post(`${API}/auth/login`, {
    data: { email: "admin@ns.com", password: "1234" },
  });
  const token = loginRes.ok() ? (await loginRes.json()).access_token : null;
  let fuerzaUrl = `${FRONTEND}/fuerza`;
  if (token) {
    const headers = { Authorization: `Bearer ${token}` };
    const exRes = await page.request.get(`${API}/exercises`, { headers });
    const exercises = exRes.ok() ? await exRes.json() : [];
    const squat = exercises.find((e) => e.name === "Sentadilla - Back Squat");
    const logsRes = await page.request.get(`${API}/logs`, { headers });
    const logs = logsRes.ok() ? await logsRes.json() : [];
    const withSquat = logs.filter((l) => squat && l.exercise_id === squat.id);
    if (withSquat.length > 0) {
      fuerzaUrl = `${FRONTEND}/fuerza?atleta=${withSquat[0].athlete_id}&ejercicio=${squat.id}`;
    } else if (squat) {
      const athletesRes = await page.request.get(`${API}/athletes`, { headers });
      const athletes = athletesRes.ok() ? await athletesRes.json() : [];
      if (athletes[0]) {
        fuerzaUrl = `${FRONTEND}/fuerza?atleta=${athletes[0].id}&ejercicio=${squat.id}`;
      }
    }
  }

  await page.goto(fuerzaUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: join(outDir, "01-ejercicios-nombres-excel.png"),
    fullPage: true,
  });

  const resumen = page.getByRole("heading", { name: "Resumen de rendimiento" });
  if (await resumen.count()) {
    await resumen.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(outDir, "02-resumen-5-tarjetas.png"),
      fullPage: false,
    });
  }

  const historial = page.getByRole("heading", { name: "Historial de evaluaciones" });
  if (await historial.count()) {
    await historial.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: join(outDir, "03-historial-5-tarjetas-sin-volumen.png"),
      fullPage: false,
    });
  }

  const listRows = page.locator('button[aria-expanded]').filter({ hasText: /kg RM/ });
  const rowCount = await listRows.count();
  if (rowCount > 0) {
    await listRows.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: join(outDir, "04-listado-tabla-rm-evaluacion-seleccionada.png"),
      fullPage: true,
    });
    if (rowCount > 1) {
      await listRows.nth(1).click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: join(outDir, "05-segunda-evaluacion-otro-rm.png"),
        fullPage: true,
      });
    }
    const badge = page.getByText(/RM de esta evaluación:/);
    const hasBadge = (await badge.count()) > 0;
    const noBestHistorical = (await page.getByText(/mejor RM histórico/i).count()) === 0;
    const noRegistroBlock =
      (await page.getByRole("heading", { name: "Registro de evaluación" }).count()) === 0;
    writeFileSync(
      join(outDir, "evidence-checks.json"),
      JSON.stringify(
        {
          rmDeEstaEvaluacionVisible: hasBadge,
          sinMejorRmHistoricoEnUi: noBestHistorical,
          sinBloqueRegistroEvaluacion: noRegistroBlock,
        },
        null,
        2,
      ),
    );
  }

  if (token) {
    const ex = await page.request.get(`${API}/exercises`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const names = ex.ok() ? (await ex.json()).map((e) => e.name) : [];
    writeFileSync(join(outDir, "api-exercise-names.json"), JSON.stringify(names, null, 2));
  }

  await browser.close();
  console.log("Screenshots en", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
