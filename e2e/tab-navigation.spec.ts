import { test, expect } from '@playwright/test';

const publicRoutes = [
  { path: '/', name: 'Inicio', contentLinks: ['Ingresar', 'Crear cuenta'] },
  { path: '/ingresar', name: 'Ingresar', contentLinks: [] },
  { path: '/registro', name: 'Registro', contentLinks: [] },
  { path: '/ayuda', name: 'Ayuda', contentLinks: [] },
  { path: '/base-tecnica', name: 'Base técnica', contentLinks: ['Reintentar'] },
  {
    path: '/ruta-desconocida-404',
    name: '404 · Página no encontrada',
    contentLinks: ['Volver al Inicio'],
  },
];

const expectedNav = ['Inicio', 'Ingresar', 'Registro', 'Panel', 'Perfil', 'Ayuda', 'Base técnica'];

test.describe('Navegación por Teclado (TS-04) y Rutas Privadas (US-03) en Chromium', () => {
  for (const { path, name, contentLinks } of publicRoutes) {
    test(`Ruta pública ${path} (${name}) — Enlace de salto y orden Tab`, async ({ page }) => {
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

      // 1. Primer Tab enfoca «Saltar al contenido»
      await page.keyboard.press('Tab');
      const skipLink = page.getByRole('link', { name: 'Saltar al contenido' });
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();

      // 2. Siguientes 7 Tabs recorren el menú principal en orden exacto con foco visible
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

      // 3. Verifica controles de utilidad después de la navegación
      await page.keyboard.press('Tab'); // Botón Día Marea / Noche Marea
      await page.keyboard.press('Tab'); // Botón Pausar mar / Reanudar mar

      // 4. Verifica enlaces principales esperados en Inicio, Base técnica y 404
      for (const linkText of contentLinks) {
        if (path === '/base-tecnica') {
          await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        }
        await page.keyboard.press('Tab');
        const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
        expect(activeText).toBe(linkText);
      }
    });
  }

  for (const privatePath of ['/panel', '/perfil', '/salas/demo-1']) {
    test(`Ruta privada ${privatePath} sin sesión redirige a /ingresar (US-03)`, async ({ page }) => {
      await page.goto(privatePath);
      await page.waitForURL('**/ingresar');
      await expect(page.getByRole('heading', { name: /^Ingresar$/i })).toBeVisible();
      await expect(page.getByText(privatePath)).toBeVisible();
    });
  }

  test('Recorrido completo por teclado en /ingresar (Tab hasta botón de enviar y Enter)', async ({
    page,
  }) => {
    await page.goto('/ingresar');
    await page.waitForLoadState('domcontentloaded');

    // Saltar al contenido con el primer Tab + Enter
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
    await page.keyboard.press('Enter');

    // Tab 1: Continuar con Google
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeFocused();

    // Tab 2: Correo institucional
    await page.keyboard.press('Tab');
    const emailInput = page.getByLabel(/Correo institucional/i);
    await expect(emailInput).toBeFocused();
    await page.keyboard.type('andres.barbosa@correounivalle.edu.co');

    // Tab 3: Contraseña
    await page.keyboard.press('Tab');
    const pwInput = page.getByLabel(/^Contraseña$/i);
    await expect(pwInput).toBeFocused();

    // Tab 4: Mostrar contraseña
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /Mostrar contraseña/i })).toBeFocused();

    // Tab 5: Botón enviar «Ingresar al Panel» y disparo con Enter
    await page.keyboard.press('Tab');
    const submitBtn = page.getByRole('button', { name: /Ingresar al Panel/i });
    await expect(submitBtn).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByText(/Ingresa tu contraseña para continuar/i)).toBeVisible();
  });

  test('Registro (/registro) valida campos inline, soporta modo reducido y alterna tema Claro/Oscuro', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/registro');

    await expect(page.getByRole('heading', { name: /Crea tu cuenta/i })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: /Progreso del registro/i })).toBeVisible();
    await expect(page.getByText(/Paso 1 de 2/i)).toBeVisible();

    // Verifica que el botón de pausa refleja el estado de movimiento reducido
    const pauseButton = page.getByRole('button', { name: /animación de fondo/i });
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'true');

    // Alterna entre modo Oscuro y Claro
    const themeBtn = page.getByRole('button', { name: /Cambiar a modo claro/i });
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Prueba validación inline conservando datos escritos
    await page.getByLabel(/^Apellidos$/i).fill('Salazar');
    await page.getByRole('button', { name: /Crear cuenta e ingresar al Panel/i }).click();
    await expect(page.getByText(/Ingresa tu correo institucional/i)).toBeVisible();
    await expect(page.getByLabel(/^Apellidos$/i)).toHaveValue('Salazar');

    // Comprobación responsive móvil (390px) sin desbordamiento horizontal
    await page.setViewportSize({ width: 390, height: 844 });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasOverflow).toBe(false);
  });
});
