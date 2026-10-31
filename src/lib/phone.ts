/**
 * Indian mobile number rules, kept identical to the backend's
 * normalize_indian_mobile (app/utils/validation.py).
 * Returns an error message, or null when the number is valid.
 */
export function phoneError(input: string): string | null {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (!/^[6-9]\d{9}$/.test(digits)) return "Enter a valid 10-digit Indian mobile number";
  if (/^(\d)\1{9}$/.test(digits)) return "Repeated-digit phone numbers are not allowed";
  for (let i = 0; i <= digits.length - 5; i++) {
    const part = digits.slice(i, i + 5);
    if ("0123456789".includes(part) || "9876543210".includes(part)) {
      return "Sequential phone number patterns are not allowed";
    }
  }
  return null;
}

export const onlyDigits = (value: string, max = 10) => value.replace(/\D/g, "").slice(0, max);
