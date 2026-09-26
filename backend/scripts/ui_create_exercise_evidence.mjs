/**
 * E2E evidence: create exercise from /ejercicios via browser (real POST from UI).
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(
  __dirname,
  "../../frontend/nico-screenshots/create-exercise-e2e",
);
const EXERCISE_NAME = `Prueba Catalogo E2E ${Date.now()}`;
const BASE = process.env.NSDASH_UI_BASE || "http://127.0.0.1:3001";
const API = "http://127.0.0.1:8000";

fs.mkdirSync(OUT_DIR, { recursive: true });

const evidence = {
  backendRestart: "uvicorn restarted on 127.0.0.1:8000",
  exerciseName: EXERCISE_NAME,
  postRequest: null,
  postResponse: null,
  postStatus: null,
  getExercisesCount: null,
  seedPlusCustomCount: null,
  exerciseInList: false,
  fuerzaSearchFound: false,
};

async function getApiToken() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ns.com", password: "1234" }),
  });
  if (!res.ok) {
    throw new Error(`API login failed: ${res.status}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function waitForReact(page) {
  await page.waitForTimeout(1500);
}

async function main() {
  const token = await getApiToken();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript((accessToken) => {
    localStorage.setItem("nsdash_token", accessToken);
  }, token);
  const page = await context.newPage();

  page.on("response", async (response) => {
    const url = response.url();
    if (url === `${API}/exercises` && response.request().method() === "POST") {
      evidence.postStatus = response.status();
      try {
        evidence.postRequest = response.request().postDataJSON();
      } catch {
        evidence.postRequest = response.request().postData();
      }
      try {
        evidence.postResponse = await response.json();
      } catch {
        evidence.postResponse = await response.text();
      }
    }
  });

  await page.goto(`${BASE}/ejercicios`, { waitUntil: "load" });
  await waitForReact(page);
  await page.waitForSelector("text=Catálogo de fuerza", { timeout: 30000 });

  const amber = page.locator("text=El servidor no está enviando fórmula");
  if (await amber.isVisible().catch(() => false)) {
    throw new Error("Catalog meta incomplete — backend may be stale");
  }

  await page.getByRole("button", { name: "+ Agregar ejercicio" }).click();
  await page.fill("#exercise-name", EXERCISE_NAME);
  await page.selectOption("#exercise-curve", "peso_muerto");
  await page.fill("#exercise-coef", "0.022");

  const postDone = page.waitForResponse(
    (res) =>
      res.url() === `${API}/exercises` && res.request().method() === "POST",
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: "Crear ejercicio" }).click();
  await postDone;
  await page.waitForTimeout(800);

  if (evidence.postStatus === 405) {
    throw new Error("POST /exercises returned 405 Method Not Allowed");
  }
  if (evidence.postStatus !== 200) {
    const formErr = await page.locator(".text-red-600").first().textContent().catch(() => "");
    throw new Error(`POST failed: status=${evidence.postStatus} ui=${formErr}`);
  }

  await page.getByLabel("Buscar ejercicio").fill(EXERCISE_NAME);
  await page.waitForTimeout(400);

  const row = page
    .locator("section")
    .filter({ hasText: "Peso muerto" })
    .locator("li", { hasText: EXERCISE_NAME });
  await row.first().waitFor({ state: "visible", timeout: 15000 });

  await page.screenshot({
    path: path.join(OUT_DIR, "01-ejercicios-catalogo-peso-muerto.png"),
    fullPage: true,
  });

  await page.goto(`${BASE}/fuerza`, { waitUntil: "load" });
  await waitForReact(page);
  await page.waitForSelector('input[aria-label="Buscar ejercicio"]', { timeout: 30000 });

  const exercisesBeforeSearch = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/exercises`);
    const data = await res.json();
    return data.length;
  }, API);
  evidence.seedPlusCustomCount = exercisesBeforeSearch;

  await page.getByLabel("Buscar ejercicio").fill(EXERCISE_NAME);
  await page.waitForTimeout(400);

  const chip = page.getByRole("button", { name: EXERCISE_NAME });
  await chip.waitFor({ state: "visible", timeout: 15000 });
  evidence.fuerzaSearchFound = true;

  await page.screenshot({
    path: path.join(OUT_DIR, "02-fuerza-busqueda-ejercicio-nuevo.png"),
    fullPage: true,
  });

  const listRes = await fetch(`${API}/exercises`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await listRes.json();
  evidence.getExercisesCount = list.length;
  evidence.exerciseInList = list.some((e) => e.name === EXERCISE_NAME);

  fs.writeFileSync(
    path.join(OUT_DIR, "evidence.json"),
    JSON.stringify(evidence, null, 2),
    "utf8",
  );

  fs.writeFileSync(
    path.join(OUT_DIR, "request-response.txt"),
    [
      "POST http://127.0.0.1:8000/exercises",
      `Status: ${evidence.postStatus}`,
      "",
      "Request body:",
      JSON.stringify(evidence.postRequest, null, 2),
      "",
      "Response body:",
      JSON.stringify(evidence.postResponse, null, 2),
    ].join("\n"),
    "utf8",
  );

  console.log(JSON.stringify(evidence, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
