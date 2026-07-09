/** Convierte cifras habituales en CoVA a forma hablada para TTS. */
export function formatNumbersForVoiceEs(text: string): string {
  let result = text;

  // Presupuesto CoVA (2.934.000 € sin IVA) — variantes de escritura
  const covaBudgetSpoken =
    "dos millones novecientos treinta y cuatro mil euros sin IVA";
  result = result.replace(
    /2[.\s]?934[.\s]?000\s*(?:€|euros?)?(?:\s*\([^)]*IVA[^)]*\))?/gi,
    covaBudgetSpoken,
  );
  result = result.replace(/2934000\s*(?:€|euros?)?/gi, covaBudgetSpoken);

  // Redondeo hablado cuando el contexto es presupuesto
  result = result.replace(
    /(?:casi|unos|aproximadamente)\s*3[.\s]?000[.\s]?000\s*(?:€|euros?)?/gi,
    "casi tres millones de euros",
  );

  // Porcentaje FEDER 60 %
  result = result.replace(/\b60\s*%/g, "sesenta por ciento");
  result = result.replace(/\b60\s*por\s*100\b/gi, "sesenta por ciento");

  // Importes europeos: 1.234.567 € → palabras aproximadas
  result = result.replace(/\b(\d{1,3}(?:\.\d{3})+)\s*€/g, (_match, numStr: string) => {
    const amount = Number.parseInt(numStr.replace(/\./g, ""), 10);
    if (!Number.isFinite(amount)) return _match;
    return speakEuroAmount(amount);
  });

  // Evitar lectura dígito a dígito: "2 0 0 0" o "2-0-0-0"
  result = result.replace(/\b(\d(?:\s+|-)\d(?:\s+|-)\d(?:\s+|-)?\d*)\b/g, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 4) {
      const amount = Number.parseInt(digits, 10);
      if (Number.isFinite(amount) && amount >= 1000) {
        return speakEuroAmount(amount);
      }
    }
    return match;
  });

  // Sustituir números sueltos muy grandes en contexto monetario
  result = result.replace(
    /\b(\d{7,})\s*(?:€|euros?)\b/gi,
    (_m, digits: string) => speakEuroAmount(Number.parseInt(digits, 10)),
  );

  return result.replace(/\s+/g, " ").trim();
}

function speakEuroAmount(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = Math.floor(amount / 1_000_000);
    const remainder = amount % 1_000_000;
    const thousands = Math.floor(remainder / 1000);
    const millionsWord = millions === 1 ? "un millón" : `${spellUnder100(millions)} millones`;
    if (thousands > 0) {
      return `${millionsWord} ${spellUnder100(thousands)} mil euros`;
    }
    return `${millionsWord} de euros`;
  }
  if (amount >= 1000) {
    const thousands = Math.floor(amount / 1000);
    return `${spellUnder100(thousands)} mil euros`;
  }
  return `${spellUnder100(amount)} euros`;
}

function spellUnder100(n: number): string {
  const units = [
    "cero",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ];
  const tens = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const hundreds = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];

  if (n < 20) return units[n] ?? String(n);
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return tens[t] ?? String(n);
    if (t === 2) return `veinti${units[u]}`;
    return `${tens[t]} y ${units[u]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (n === 100) return "cien";
    if (rest === 0) return hundreds[h] ?? String(n);
    return `${hundreds[h]} ${spellUnder100(rest)}`;
  }
  return String(n);
}
