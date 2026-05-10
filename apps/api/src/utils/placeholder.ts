/**
 * Message placeholder replacement utility
 */

interface PlaceholderReplacements {
  userName?: string;
  characterName?: string;
}

/**
 * Replace placeholders in text with actual values
 *
 * Supports:
 * - {{user}} → User/Persona name
 * - {{char}} → Character name
 */
export function replacePlaceholders(
  text: string,
  replacements: PlaceholderReplacements
): string {
  let result = text;

  // Replace {{user}} with user/persona name
  if (replacements.userName) {
    result = result.replace(/\{\{user\}\}/gi, replacements.userName);
  }

  // Replace {{char}} with character name
  if (replacements.characterName) {
    result = result.replace(/\{\{char\}\}/gi, replacements.characterName);
  }

  return result;
}
