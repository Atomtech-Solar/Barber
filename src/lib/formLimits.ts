/** Limites de entrada para validação no cliente (UX; regra de negócio na API). */
export const FIELD_LIMITS = {
  emailMax: 254,
  passwordMax: 128,
  fullNameMax: 200,
  phoneMax: 32,
  notesMax: 5000,
} as const;
