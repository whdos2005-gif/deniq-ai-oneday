export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 30 || !/^[+\d\s()-]*$/.test(value)) return '';
  let digits = value.replace(/[\s()-]/g, '');
  if (digits.startsWith('+82')) digits = '0' + digits.slice(3);
  if (/^010\d{8}$/.test(digits) || /^01[16789]\d{7,8}$/.test(digits)) return digits;
  return '';
}

export function formatPhone(value) {
  const digits = normalizePhone(value);
  return digits ? digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') : '';
}
