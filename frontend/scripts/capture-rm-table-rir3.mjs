import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "rm-table-rir3");
mkdirSync(outDir, { recursive: true });

const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://127.0.0.1:8000";

async function loginApi(request) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: "admin@ns.com", password: "1234" },
  });
  if (!res.ok()) throw new Error("login failed");
  return (await res.json()).access_token;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/inicio", { timeout: 25000 });

  const token = await loginApi(page.request);
  const headers = { Authorization: `Bearer ${token}` };

  const exercises = await (await page.request.get(`${API}/exercises`, { headers })).json();
  const squat =
    exercises.find((e) => e.name === "Sentadilla - Front Squat") ??
    exercises.find((e) => e.name?.includes("Front Squat"));
  if (!squat) throw new Error("No Front Squat exercise");

  const athletes = await (await page.request.get(`${API}/athletes`, { headers })).json();
  const athlete = athletes.find((a) => a.name?.includes("Santiago")) ?? athletes[0];
  if (!athlete) throw new Error("No athlete");

  const today = new Date().toISOString().slice(0, 10);

  async function ensureLog(reps, weight) {
    const logs = await (await page.request.get(`${API}/logs`, { headers })).json();
    const match = logs.find(
      (l) =>
        l.athlete_id === athlete.id &&
        l.exercise_id === squat.id &&
        l.reps === reps &&
        Math.abs(l.weight - weight) < 0.01,
    );
    if (match) return match;
    const created = await page.request.post(`${API}/logs`, {
      headers: { ...headers, "Content-Type": "application/json" },
      data: {
        athlete_id: athlete.id,
        exercise_id: squat.id,
        date: today,
        weight,
        reps,
      },
    });
    if (!created.ok()) {
      const body = await created.text();
      throw new Error(`create log failed: ${created.status()} ${body}`);
    }
    return await created.json();
  }

  const log10 = await ensureLog(10, 80);
  const log2 = await ensureLog(2, 100);

  const openTable = async (logId) => {
    const url = `${FRONTEND}/fuerza?atleta=${athlete.id}&ejercicio=${squat.id}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const rows = page.locator('button[aria-expanded]').filter({ hasText: /kg RM/ });
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await row.click();
      await page.waitForTimeout(800);
      const table = page.getByTestId("percentage-rm-table");
      if (await table.count()) {
        const badge = page.getByText(/RM de esta evaluación/);
        if (await badge.count()) {
          return table;
        }
      }
      await row.click();
    }
    throw new Error(`Could not open table for log ${logId}`);
  };

  await page.goto(`${FRONTEND}/fuerza?atleta=${athlete.id}&ejercicio=${squat.id}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1200);

  const rows = page.locator('button[aria-expanded]').filter({ hasText: /kg RM/ });
  for (let i = 0; i < await rows.count(); i++) {
    const text = await rows.nth(i).innerText();
    if (text.includes("10 rep")) {
      await rows.nth(i).click();
      await page.waitForTimeout(1500);
      const table = page.getByTestId("percentage-rm-table");
      await table.scrollIntoViewIfNeeded();
      await table.screenshot({
        path: join(outDir, "01-evaluacion-10-reps-tabla-completa.png"),
      });
      break;
    }
  }

  for (let i = 0; i < await rows.count(); i++) {
    const text = await rows.nth(i).innerText();
    if (text.includes("2 rep") || text.includes("1 rep") || text.includes("3 rep")) {
      await rows.nth(i).click();
      await page.waitForTimeout(1500);
      const table = page.getByTestId("percentage-rm-table");
      await table.scrollIntoViewIfNeeded();
      await table.screenshot({
        path: join(outDir, "02-evaluacion-pocas-reps-filas-1-3.png"),
      });
      const row10 = table.locator("tbody tr").filter({ hasText: /^10\t|^10 / }).first();
      if (await row10.count()) {
        await row10.screenshot({
          path: join(outDir, "03-fila-10-reps-rir-9-8-7.png"),
        });
      }
      const topRows = table.locator("tbody tr").first();
      await table.locator("tbody tr").nth(0).screenshot({
        path: join(outDir, "04-fila-1-rep-rir-ceros.png"),
      });
      await table.locator("tbody tr").nth(1).screenshot({
        path: join(outDir, "05-fila-2-reps.png"),
      });
      await table.locator("tbody tr").nth(2).screenshot({
        path: join(outDir, "06-fila-3-reps.png"),
      });
      break;
    }
  }

  await browser.close();
  console.log("Capturas en", outDir);
  console.log("Logs usados:", { log10: log10.id, log2: log2.id });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
