const FORBIDDEN_CHARACTERS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

function isAllowedCharacter(character: string): boolean {
  // Управляющие символы (0x00–0x1F) недопустимы в именах файлов.
  return character.charCodeAt(0) > 0x1f && !FORBIDDEN_CHARACTERS.has(character);
}

export function sanitizeFileName(name: string, fallback: string): string {
  const sanitized = Array.from(name).filter(isAllowedCharacter).join('').trim();
  return sanitized || fallback;
}
