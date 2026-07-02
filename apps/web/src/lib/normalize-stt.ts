/** Corrige transcripciones habituales del nombre del asistente. */
const COVA_MISHEARING_PATTERNS: RegExp[] = [
  /\bko\s*ba\b/gi,
  /\bco\s*ba\b/gi,
  /\bko\s*va\b/gi,
  /\bco\s*va\b/gi,
  /\bko\s*pa\b/gi,
  /\bco\s*pa\b/gi,
  /\bkoba\b/gi,
  /\bcoba\b/gi,
  /\bkova\b/gi,
  /\bcovia\b/gi,
  /\bcova\b/gi,
];

export function normalizeCovaInTranscript(text: string): string {
  let result = text;
  for (const pattern of COVA_MISHEARING_PATTERNS) {
    result = result.replace(pattern, "CoVA");
  }
  return result.replace(/\s+/g, " ").trim();
}
