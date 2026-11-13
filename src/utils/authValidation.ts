export interface PasswordCriterion {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordEvaluation {
  score: number;
  label: string;
  criteria: PasswordCriterion[];
  isValid: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$/;

/** Normaliza un nombre de usuario a minúsculas sin espacios ni arroba inicial. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
}

/** Valida el formato del nombre de usuario único y retorna mensaje de corrección o null. */
export function validateUsername(raw: string): string | null {
  const clean = normalizeUsername(raw);
  if (!clean) {
    return 'Ingresa un nombre de usuario único (mínimo 3 caracteres).';
  }
  if (clean.length < 3 || clean.length > 24) {
    return 'El nombre de usuario debe tener entre 3 y 24 caracteres.';
  }
  if (!USERNAME_PATTERN.test(clean)) {
    return 'Usa solo letras minúsculas, números, punto o guion bajo, iniciando y terminando con letra o número.';
  }
  return null;
}

/** Valida un correo electrónico no vacío con formato válido. */
export function validateEmail(raw: string): string | null {
  const email = raw.trim();
  if (!email) {
    return 'Ingresa tu correo institucional.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    return 'Ingresa un correo válido (ejemplo: estudiante@correounivalle.edu.co).';
  }
  return null;
}

/** Evalúa la política visible de contraseña en 5 criterios sin bloquear pegado. */
export function evaluatePasswordPolicy(password: string): PasswordEvaluation {
  const criteria: PasswordCriterion[] = [
    { id: 'length', label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { id: 'upper', label: 'Una letra mayúscula', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'Una letra minúscula', met: /[a-z]/.test(password) },
    { id: 'digit', label: 'Un número (0-9)', met: /[0-9]/.test(password) },
    { id: 'symbol', label: 'Un símbolo (@$!%*#?&)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = criteria.filter((item) => item.met).length;
  const requiredMet = criteria.slice(0, 4).every((item) => item.met);

  let label = 'Ingresa tu contraseña';
  if (password.length > 0 && score <= 1) label = 'Muy débil';
  else if (score <= 3) label = 'Seguridad media';
  else if (score === 4) label = 'Contraseña fuerte';
  else if (score === 5) label = 'Seguridad máxima';

  return { score, label, criteria, isValid: requiredMet };
}

/** Valida que un nombre o apellido tenga al menos 2 caracteres visibles. */
export function validatePersonName(raw: string, fieldLabel: string): string | null {
  if (raw.trim().length < 2) {
    return `Ingresa tus ${fieldLabel} (mínimo 2 caracteres).`;
  }
  return null;
}
