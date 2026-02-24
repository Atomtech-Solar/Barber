/** Aplica máscara CNPJ: 00.000.000/0000-00 */
export function maskCnpj(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

/** Valida CNPJ (somente dígitos, 14 caracteres) */
export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  let sum = 0;
  let pos = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * pos;
    pos = pos === 2 ? 9 : pos - 1;
  }
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (check !== parseInt(digits[12])) return false;
  sum = 0;
  pos = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * pos;
    pos = pos === 2 ? 9 : pos - 1;
  }
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return check === parseInt(digits[13]);
}

/** Aplica máscara telefone: (00) 00000-0000 ou (00) 0000-0000 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
