#!/usr/bin/env node
// Prueba en el navegador (Playwright + Chromium preinstalado) que el mapa de un profesor abre
// desde el inicio, que las flechas avanzan y que no hay errores. Requiere `npx vite --port 5173`
// corriendo. Deja capturas en <carpeta>.
//
// Uso: node check-map.mjs <id> "<Nombre en el carrusel>" <carpeta-capturas>

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const [id, name, out] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [w, h, tag] of [[1180, 820, 'ipad'], [390, 844, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: tag === 'phone' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  for (let i = 0; i < 10 && (await page.locator('.carousel__label').textContent()) !== name; i++) {
    await page.getByRole('button', { name: 'Profesor siguiente' }).click();
    await page.waitForTimeout(600);
  }
  await page.locator('.pcard.is-current .pcard__cta').click();
  await page.waitForTimeout(1800);
  const hash = await page.evaluate(() => location.hash);
  const tab = await page.locator('.tab').first().textContent().catch(() => '-');
  for (let i = 0; i < 4; i++) {
    await page.locator('.nav--forward').click().catch(() => {});
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: `${out}/${id}-${tag}.png` });
  await page.getByRole('button', { name: /Solo títulos/ }).click().catch(() => {});
  await page.getByRole('button', { name: /Encuadrar/ }).click().catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${id}-${tag}-titulos.png` });
  await page.getByRole('button', { name: /Solo títulos/ }).click().catch(() => {});
  const ok = hash === `#/apuntes/${id}` && tab.includes(name);
  // Los errores de certificado vienen de Google Fonts en el sandbox; no son de la app.
  const real = errors.filter((e) => !/CERT/.test(e));
  console.log(`${tag}: ${ok ? 'ok' : 'FALLA'} hash=${hash} pestaña="${tab}" tarjetas=${await page.locator('.react-flow__node').count()} errores=${JSON.stringify(real)}`);
  await ctx.close();
}
await browser.close();
