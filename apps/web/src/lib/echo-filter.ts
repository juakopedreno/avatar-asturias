function normalizeForEchoCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detecta si el STT ha captado sobre todo la voz del avatar (altavoz → micrófono). */
export function isLikelyAssistantEcho(userText: string, assistantText: string | null | undefined): boolean {
  const user = normalizeForEchoCompare(userText);
  const assistant = normalizeForEchoCompare(assistantText ?? "");
  if (!user || !assistant) return false;

  if (assistant.includes(user) || user.includes(assistant)) {
    return true;
  }

  const userTokens = user.split(" ").filter((token) => token.length > 3);
  if (userTokens.length === 0) {
    return false;
  }

  const assistantTokens = new Set(assistant.split(" ").filter((token) => token.length > 3));
  const overlap = userTokens.filter((token) => assistantTokens.has(token)).length / userTokens.length;
  return overlap >= 0.5;
}
