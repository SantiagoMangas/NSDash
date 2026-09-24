import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "strength-step2");
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
  if (!res.ok) throw new Error("Login API failed");
  const data = await res.json();
  return data.access_token;
}

/** Pick athlete + exercise with at least one log for stable screenshots */
async function pickStrengthContext(token) {
  const athletes = await api(token, "GET", "/athletes");
  const exercises = await api(token, "GET", "/exercises");
  if (!athletes?.length || !exercises?.length) {
    throw new Error("Need athletes and exercises in DB");
  }
  const allLogs = await api(token, "GET", "/logs");
  if (Array.isArray(allLogs) && allLogs.length > 0) {
    const log = allLogs[0];
    const athlete = athletes.find((a) => a.id === log.athlete_id) ?? athletes[0];
    const exercise =
      exercises.find((e) => e.id === log.exercise_id) ?? exercises[0];
    return {
      athleteId: athlete.id,
      athleteName: athlete.name,
      exerciseName: exercise.name,
      exerciseId: exercise.id,
    };
  }
  const athlete = athletes[0];
  const exercise = exercises[0];
  await api(token, "POST", "/logs", {
    athlete_id: athlete.id,
    exercise_id: exercise.id,
    date: "2025-06-01",
    weight: 80,
    reps: 5,
  });
  await api(token, "POST", "/logs", {
    athlete_id: athlete.id,
    exercise_id: exercise.id,
    date: "2025-06-15",
    weight: 82.5,
    reps: 5,
  });
  return {
    athleteId: athlete.id,
    athleteName: athlete.name,
    exerciseName: exercise.name,
    exerciseId: exercise.id,
  };
}

async function loginLegacy(page) {
  await page.goto(`${FRONTEND}/legacy`, { waitUntil: "networkidle" });
  const email = page.locator("#email");
  if (await email.isVisible().catch(() => false)) {
    await email.fill("admin@ns.com");
    await page.locator("#password").fill("1234");
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();
    await page.waitForTimeout(2000);
  }
  await page.getByRole("button", { name: /Cerrar sesión/i }).waitFor({ state: "visible", timeout: 25000 });
}

async function main() {
  const token = await getToken();
  const ctx = await pickStrengthContext(token);

  const descriptions = [];

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await loginLegacy(page);

  await page.getByRole("button", { name: "💪 Fuerza" }).click();
  await page.waitForTimeout(400);

  const athleteRow = page.locator("li").filter({ hasText: ctx.athleteName }).first();
  await athleteRow.click();
  await page.waitForTimeout(600);

  await page.getByRole("button", { name: ctx.exerciseName, exact: true }).click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: join(outDir, "01-fuerza-overview-grafico.png"), fullPage: true });
  descriptions.push({
    file: "01-fuerza-overview-grafico.png",
    text:
      "Legacy /legacy con módulo Fuerza: atleta y ejercicio seleccionados; se ven formulario de nuevo registro, las 3 tarjetas de Resumen de Rendimiento (Est. 1RM, vs Anterior, Última sesión), gráfico Progresión de RM con filtros de rango, y bloques de analytics debajo.",
  });

  const logsSection = page.locator("section").filter({ hasText: "Registros de Entrenamiento" });
  await logsSection.scrollIntoViewIfNeeded();
  const logRow = logsSection.locator("ul li").first();
  await logRow.getByRole("button").first().click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: join(outDir, "02-log-seleccionado-resumen-porcentajes.png"), fullPage: true });
  descriptions.push({
    file: "02-log-seleccionado-resumen-porcentajes.png",
    text:
      "Mismo flujo con un registro de la lista seleccionado (fila resaltada): aparece Resumen de Sesión con 3 tarjetas (Peso, Repeticiones, RM Est.) y la Tabla de Porcentajes (columnas Reps / Peso kg).",
  });

  await logsSection.getByRole("button", { name: "Editar" }).first().click();
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, "03-modal-editar-log.png"), fullPage: true });
  descriptions.push({
    file: "03-modal-editar-log.png",
    text:
      "Modal «Editar registro de fuerza» abierto sobre el listado; campos fecha/peso/reps visibles con botones cancelar/guardar.",
  });

  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await page.waitForTimeout(400);

  await page.locator("text=Resumen de Rendimiento").scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(outDir, "04-tres-tarjetas-resumen.png"), fullPage: false });
  descriptions.push({
    file: "04-tres-tarjetas-resumen.png",
    text:
      "Recorte centrado en las 3 tarjetas del Resumen de Rendimiento (1RM estimado, variación % vs sesión anterior, última sesión con peso×reps y fecha).",
  });

  writeFileSync(
    join(outDir, "DESCRIPCIONES.md"),
    descriptions.map((d) => `## ${d.file}\n\n${d.text}\n`).join("\n"),
    "utf8",
  );

  await browser.close();
  console.log("Capturas en", outDir);
  for (const d of descriptions) {
    console.log(`- ${d.file}: ${d.text}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
