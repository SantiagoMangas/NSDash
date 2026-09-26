import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../frontend/nico-screenshots/get-exercise-e2e");
const API = "http://127.0.0.1:8000";
const BASE = process.env.NSDASH_UI_BASE || "http://localhost:3000";
const EXERCISE_ID = 5;

fs.mkdirSync(OUT, { recursive: true });

const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@ns.com", password: "1234" }),
});
const { access_token } = await login.json();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addInitScript((t) => localStorage.setItem("nsdash_token", t), access_token);
const page = await context.newPage();
await page.goto(`${BASE}/ejercicios/${EXERCISE_ID}`, { waitUntil: "load" });
await page.waitForTimeout(6000);
const notFound = await page.locator("text=Ejercicio no encontrado").count();
if (notFound > 0) {
  throw new Error("Ficha shows not found");
}
await page.waitForSelector("h1:text('Hips Thrust')", { timeout: 15000 });
await page.screenshot({ path: path.join(OUT, "ejercicios-5-ficha.png"), fullPage: true });
await browser.close();
console.log("OK", path.join(OUT, "ejercicios-5-ficha.png"));
