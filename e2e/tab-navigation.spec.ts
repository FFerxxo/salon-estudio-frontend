import { test, expect, type Page } from '@playwright/test';

interface PublicRouteSpec {
  path: string;
  name: string;
  isAccessRoute: boolean;
  expectedFooterNav: string[];
  contentLinks: string[];
  checkFooterAfterContent: boolean;
}

const publicRoutes: PublicRouteSpec[] = [
  {
    path: '/',
    name: 'Inicio',
    isAccessRoute: true,
    expectedFooterNav: ['Ayuda', 'Base técnica'],
    contentLinks: ['Vamos a estudiar'],
    checkFooterAfterContent: true,
  },
  {
    path: '/ingresar',
    name: 'Ingresar',
    isAccessRoute: true,
    expectedFooterNav: ['Inicio', 'Ayuda', 'Base técnica'],
    contentLinks: [],
    checkFooterAfterContent: false,
  },
  {
    path: '/registro',
    name: 'Registro',
    isAccessRoute: true,
    expectedFooterNav: ['Inicio', 'Ayuda', 'Base técnica'],
    contentLinks: [],
    checkFooterAfterContent: false,
  },
  {
    path: '/ayuda',
    name: 'Ayuda',
    isAccessRoute: false,
    expectedFooterNav: ['Inicio', 'Ayuda', 'Base técnica', 'Ingresar'],
    contentLinks: [],
    checkFooterAfterContent: true,
  },
  {
    path: '/base-tecnica',
    name: 'Base técnica',
    isAccessRoute: false,
    expectedFooterNav: ['Inicio', 'Ayuda', 'Base técnica', 'Ingresar'],
    contentLinks: ['Reintentar'],
    checkFooterAfterContent: true,
  },
  {
    path: '/ruta-desconocida-404',
    name: '404 · Página no encontrada',
    isAccessRoute: false,
    expectedFooterNav: ['Inicio', 'Ayuda', 'Base técnica', 'Ingresar'],
    contentLinks: ['Volver al Inicio'],
    checkFooterAfterContent: true,
  },
];

async function activeHasVisibleOutline(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.outlineStyle !== 'none' || style.outlineWidth !== '0px';
  });
}

test.describe('Navegación por Teclado (TS-04) y Rutas Privadas (US-03) en Chromium', () => {
  for (const {
    path,
    name,
    isAccessRoute,
    expectedFooterNav,
    contentLinks,
    checkFooterAfterContent,
  } of publicRoutes) {
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

      // 2. Cabecera minimalista solo con controles de pausa (acceso) y tema Día/Noche
      if (isAccessRoute) {
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: /Pausar fondo/i })).toBeFocused();
        expect(await activeHasVisibleOutline(page)).toBe(true);
      }
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /Cambiar a modo claro/i })).toBeFocused();
      expect(await activeHasVisibleOutline(page)).toBe(true);

      // 3. Enlaces/botones principales dentro de <main>
      for (const linkText of contentLinks) {
        if (path === '/base-tecnica') {
          await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        }
        await page.keyboard.press('Tab');
        const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
        expect(activeText).toBe(linkText);
        expect(await activeHasVisibleOutline(page)).toBe(true);
      }

      // 4. En rutas sin campos extra en <main>, los enlaces secundarios del pie siguen en orden exacto
      if (checkFooterAfterContent) {
        for (const footerLabel of expectedFooterNav) {
          await page.keyboard.press('Tab');
          const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
          expect(activeText).toBe(footerLabel);
          expect(await activeHasVisibleOutline(page)).toBe(true);
        }
      }
    });
  }

  for (const privatePath of ['/panel', '/perfil', '/salas/demo-1']) {
    test(`Ruta privada ${privatePath} sin sesión redirige a /ingresar (US-03)`, async ({ page }) => {
      await page.goto(privatePath);
      await page.waitForURL('**/ingresar');
      await expect(page).toHaveURL(/\/ingresar$/);
      await expect(page).toHaveTitle('Ingresar · Tuga - Salón de Estudio');
      await expect(page.getByRole('heading', { name: /^Ingresar$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Ingresar con correo/i })).toBeVisible();
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

    // Tab 2: Correo
    await page.keyboard.press('Tab');
    const emailInput = page.getByLabel(/^Correo$/i);
    await expect(emailInput).toBeFocused();
    await page.keyboard.type('andres.barbosa@correounivalle.edu.co');

    // Tab 3: Contraseña
    await page.keyboard.press('Tab');
    const pwInput = page.getByLabel(/^Contraseña$/i);
    await expect(pwInput).toBeFocused();

    // Tab 4: Mostrar contraseña
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /Mostrar contraseña/i })).toBeFocused();

    // Tab 5: Recuperación de contraseña
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: /¿Olvidaste tu contraseña\?/i })
    ).toBeFocused();

    // Tab 6: Botón enviar «Ingresar con correo» y disparo con Enter
    await page.keyboard.press('Tab');
    const submitBtn = page.getByRole('button', { name: /Ingresar con correo/i });
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

    // Con movimiento reducido el fondo queda estático y el botón de pausa no se muestra (SC 2.2.2)
    await expect(page.getByRole('button', { name: /(Pausar|Reanudar) fondo/i })).toHaveCount(0);

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
