import { describe, expect, it } from 'vitest';
import {
  MENSAJES,
  reglasContrasena,
  validarContrasenaNueva,
  validarCorreo,
  validarNombres,
  validarUsername,
} from '../lib/validacion';

describe('Validaciones del registro (mismas reglas que la API)', () => {
  it('exige nombres y limita a 50 caracteres', () => {
    expect(validarNombres('  ')).toBe(MENSAJES.nombresVacio);
    expect(validarNombres('a'.repeat(51))).toBe(MENSAJES.nombresLargo);
    expect(validarNombres('Juan Pablo')).toBeNull();
  });

  it('valida el formato del nombre de usuario', () => {
    expect(validarUsername('')).toBe(MENSAJES.usernameVacio);
    expect(validarUsername('ab')).toBe(MENSAJES.usernameFormato);
    expect(validarUsername('con espacio')).toBe(MENSAJES.usernameFormato);
    expect(validarUsername('juan_pablo23')).toBeNull();
  });

  it('valida el formato del correo', () => {
    expect(validarCorreo('')).toBe(MENSAJES.correoVacio);
    expect(validarCorreo('juan@')).toBe(MENSAJES.correoFormato);
    expect(validarCorreo('juan@correounivalle.edu.co')).toBeNull();
  });

  it('aplica la política de contraseña visible', () => {
    expect(validarContrasenaNueva('')).toBe(MENSAJES.contrasenaVacia);
    expect(validarContrasenaNueva('abcdefgh')).toBe(MENSAJES.contrasenaDebil);
    expect(validarContrasenaNueva('abc12345')).toBeNull();
    expect(reglasContrasena('a1').map((r) => r.cumple)).toEqual([false, true, true]);
  });
});
