/**
 * Message content parser for dialogue and action markup
 */

export type MessageSegment =
  | { type: 'dialogue'; text: string }
  | { type: 'action'; text: string }
  | { type: 'narration'; text: string };

/**
 * Parse message content into dialogue, action, and narration segments
 *
 * Format:
 * - "text" → dialogue
 * - *text* → action (italic)
 * - other → narration
 *
 * @param content - Message content to parse
 * @returns Array of segments with type and text
 */
export function parseMessage(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  // Match quoted text or single-asterisk wrapped text (non-greedy)
  const regex = /(".*?"|\*(?!\*)(.+?)(?<!\*)\*(?!\*))/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add narration before the match
    if (match.index > lastIndex) {
      const narration = content.substring(lastIndex, match.index);
      if (narration) {
        segments.push({ type: 'narration', text: narration });
      }
    }

    // Process the matched segment
    const matched = match[0];
    if (matched.startsWith('"') && matched.endsWith('"')) {
      // Dialogue - remove quotes
      segments.push({
        type: 'dialogue',
        text: matched.slice(1, -1),
      });
    } else if (matched.startsWith('*') && matched.endsWith('*') && !matched.startsWith('**')) {
      // Action - remove single asterisks
      segments.push({
        type: 'action',
        text: matched.slice(1, -1),
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text as narration
  if (lastIndex < content.length) {
    const narration = content.substring(lastIndex);
    if (narration) {
      segments.push({ type: 'narration', text: narration });
    }
  }

  return segments;
}
