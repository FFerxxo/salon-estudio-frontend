import { test, expect } from '@playwright/test';

const routes = [
  { path: '/', name: 'Inicio', contentLinks: ['Ver Base técnica', 'Ingresar'] },
  { path: '/ingresar', name: 'Ingresar', contentLinks: [] },
  { path: '/registro', name: 'Registro', contentLinks: [] },
  // Rutas privadas: sin sesión llevan a Ingresar (US-03).
  { path: '/panel', name: 'Panel → Ingresar', contentLinks: [] },
  { path: '/perfil', name: 'Perfil → Ingresar', contentLinks: [] },
  { path: '/salas/demo-1', name: 'Sala demo-1 → Ingresar', contentLinks: [] },
  { path: '/ayuda', name: 'Ayuda', contentLinks: [] },
  { path: '/base-tecnica', name: 'Base técnica', contentLinks: ['Reintentar'] },
  { path: '/ruta-desconocida-404', name: '404 · Página no encontrada', contentLinks: ['Volver al Inicio'] },
];

test.describe('Pruebas de Navegación por Teclado (Tab) — 9 Rutas en Chromium', () => {
  for (const { path, name, contentLinks } of routes) {
    test(`Ruta ${path} (${name}) — Enlace de salto a contenido`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      // 1. Primer Tab enfoca el enlace de salto «Saltar al contenido»
      await page.keyboard.press('Tab');
      const skipLink = page.getByRole('link', { name: 'Saltar al contenido' });
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();

      // 2. Enter en el enlace de salto mueve el foco a <main id="contenido">
      await page.keyboard.press('Enter');
      const mainContent = page.locator('#contenido');
      await expect(mainContent).toBeFocused();
    });

    test(`Ruta ${path} (${name}) — Recorrido secuencial con Tab y foco visible`, async ({ page }) => {
      // Mock error state in /base-tecnica to test the «Reintentar» button focus
      if (path === '/base-tecnica') {
        await page.route('**/api/app-info', async (route) => {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'No se pudo leer la base de datos. Intenta de nuevo.' }),
          });
        });
      }

      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      // 1. Primer Tab: Saltar al contenido
      await page.keyboard.press('Tab');
      const active1 = await page.evaluate(() => document.activeElement?.textContent?.trim());
      expect(active1).toBe('Saltar al contenido');

      // 2. Siguientes 4 Tabs: Enlaces de la barra de navegación principal
      const expectedNav = [
        'Inicio',
        'Ingresar',
        'Registrarse',
        'Ayuda',
      ];

      for (const navLabel of expectedNav) {
        await page.keyboard.press('Tab');
        const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
        const hasVisibleOutline = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.outlineStyle !== 'none' || style.outlineWidth !== '0px';
        });

        expect(activeText).toBe(navLabel);
        expect(hasVisibleOutline).toBe(true);
      }

      // 3. Siguientes Tabs: Interactivos del cuerpo de la página (si aplican)
      for (const linkText of contentLinks) {
        if (path === '/base-tecnica') {
          await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        }

        await page.keyboard.press('Tab');
        const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
        const hasVisibleOutline = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.outlineStyle !== 'none' || style.outlineWidth !== '0px';
        });

        expect(activeText).toBe(linkText);
        expect(hasVisibleOutline).toBe(true);
      }

      // 4. Confirmar que el foco no quedó atrapado
      const finalTagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
      expect(finalTagName).not.toBeNull();
    });
  }
});
