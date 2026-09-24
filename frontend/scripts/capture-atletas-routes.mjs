import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "nico-screenshots", "atletas-routes");
mkdirSync(outDir, { recursive: true });

const FRONTEND = "http://localhost:3000";

async function login(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill("admin@ns.com");
  await page.locator("#password").fill("1234");
  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.waitForURL("**/atletas", { timeout: 25000 });
  await page.waitForTimeout(800);
}

async function main() {
  const descriptions = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await login(page);
  await page.screenshot({ path: join(outDir, "01-lista-atletas.png"), fullPage: true });
  descriptions.push({
    file: "01-lista-atletas.png",
    text:
      "/atletas con header NSDash (Atletas | Equipos), selector de equipo arriba y panel compacto: filas alfabéticas con iniciales, hover con objetivo/observaciones, iconos lupa y lápiz; botones + Agregar equipo / + Agregar atleta.",
  });

  const lupa = page.getByRole("button", { name: "Ver ficha completa" }).first();
  await lupa.click();
  await page.waitForURL("**/atletas/**/fuerza", { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outDir, "02-ficha-tab-fuerza.png"), fullPage: true });
  descriptions.push({
    file: "02-ficha-tab-fuerza.png",
    text:
      "Tras clic en lupa: ficha del atleta arriba (nombre, deporte/posición, edad, altura, peso, objetivo, observaciones, lesiones, lápiz y «Volver a la lista»), tabs Fuerza (activo) / Velocidad y Resistencia, y StrengthModule debajo (ejercicios + módulo de fuerza).",
  });

  await page.locator('a[href$="/resistencia"]').click();
  await page.waitForURL("**/resistencia", { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(outDir, "03-tab-resistencia.png"), fullPage: true });
  descriptions.push({
    file: "03-tab-resistencia.png",
    text:
      "Misma ficha con tab Resistencia activo (subruta /resistencia); ResistenciaModule montado debajo sin Tabla Nacional.",
  });

  await page.getByRole("button", { name: "Editar ficha del atleta" }).click();
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, "04-modal-editar-ficha.png"), fullPage: true });
  descriptions.push({
    file: "04-modal-editar-ficha.png",
    text:
      "Modal «Editar atleta» abierto desde el lápiz de la ficha; formulario completo con campos del atleta.",
  });

  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await page.waitForTimeout(300);

  await page.getByRole("link", { name: /Volver a la lista/i }).click();
  await page.waitForURL("**/atletas", { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outDir, "05-vuelta-lista.png"), fullPage: true });
  descriptions.push({
    file: "05-vuelta-lista.png",
    text:
      "De vuelta en /atletas tras «Volver a la lista»; lista compacta visible de nuevo.",
  });

  writeFileSync(
    join(outDir, "DESCRIPCIONES.md"),
    descriptions.map((d) => `## ${d.file}\n\n${d.text}\n`).join("\n"),
    "utf8",
  );

  await browser.close();
  console.log("Capturas en", outDir);
  for (const d of descriptions) console.log(`- ${d.file}: ${d.text}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
