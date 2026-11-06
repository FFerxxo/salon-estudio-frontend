import { describe, expect, it } from 'vitest';
import html from '../../index.html?raw';

describe('index.html base (TS-04)', () => {
  it('declara el idioma español', () => {
    expect(html).toContain('<html lang="es">');
  });

  it('tiene descripción para buscadores y lectores', () => {
    expect(html).toMatch(/<meta name="description" content=".+"/);
  });

  it('enlaza el favicon para evitar errores 404 en la consola', () => {
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
  });
});