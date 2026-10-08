import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "..", "assets");
mkdirSync(assetsDir, { recursive: true });

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const email = "admin@ns.com";
const passwords = ["TestPass123!", "1234"];

async function apiLogin() {
  for (const password of passwords) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) return { password, body: await res.json() };
  }
  throw new Error("Login API falló; ¿backend en 8000 con admin?");
}

const { password, body } = await apiLogin();
const browser = await chromium.launch();

// 1) Header admin con backend OK
const page1 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page1.goto("http://localhost:3000/login");
await page1.fill('input[type="email"]', email);
await page1.fill('input[type="password"]', password);
await page1.click('button[type="submit"]');
await page1.waitForURL("**/inicio**", { timeout: 20000 });
await page1.waitForSelector("text=Preparadores", { timeout: 20000 });
await page1.waitForSelector('a[href="/perfil"]', { timeout: 5000 });
const adminPath = join(assetsDir, "header-admin-verify.png");
await page1.screenshot({ path: adminPath, fullPage: false });
console.log("OK admin header:", adminPath);
await page1.close();

// 2) Backend caído: token viejo → login con aviso (sin menú autenticado)
const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page2.addInitScript((token) => {
  localStorage.setItem("nsdash_token", token);
}, body.access_token);

await page2.route("http://127.0.0.1:8000/**", (route) => route.abort("failed"));
await page2.route("http://localhost:8000/**", (route) => route.abort("failed"));

await page2.goto("http://localhost:3000/inicio", { waitUntil: "domcontentloaded" });
await page2.waitForURL("**/login**", { timeout: 20000 });
await page2.waitForSelector("text=No pudimos validar tu sesión", { timeout: 10000 });
const hasPreparadores = await page2.locator("text=Preparadores").count();
if (hasPreparadores > 0) throw new Error("No debería mostrarse Preparadores con backend caído");
const downPath = join(assetsDir, "login-backend-down.png");
await page2.screenshot({ path: downPath, fullPage: false });
console.log("OK backend down:", downPath);

await browser.close();
