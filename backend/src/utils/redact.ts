const PHONE_REGEX = /(\+?\d[\d\-\s]{7,}\d)/g;
const CARD_REGEX = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{1,4}\b/g;
const SSN_REGEX = /\b\d{3}-?\d{2}-?\d{4}\b/g;

export function redactPII(input: string): string {
  return input
    .replace(PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(CARD_REGEX, '[REDACTED_CARD]')
    .replace(SSN_REGEX, '[REDACTED_SSN]');
}
