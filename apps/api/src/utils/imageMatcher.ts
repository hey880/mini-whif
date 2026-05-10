/**
 * Situational image trigger matcher
 */

interface SituationalImage {
  id: string;
  imageUrl: string;
  triggers: string[];
  description?: string;
}

interface TriggeredImage {
  id: string;
  imageUrl: string;
  description?: string;
}

/**
 * Match message content with situational image triggers
 *
 * @param messageContent - AI message content to check
 * @param situationalImages - Character's situational images with triggers
 * @returns Array of triggered images to display
 */
export function matchTriggeredImages(
  messageContent: string,
  situationalImages: SituationalImage[]
): TriggeredImage[] {
  const triggered: TriggeredImage[] = [];
  const lowerContent = messageContent.toLowerCase();

  for (const img of situationalImages) {
    // Check if any trigger keyword is in the message
    for (const trigger of img.triggers) {
      if (lowerContent.includes(trigger.toLowerCase())) {
        // Add this image (only once per image)
        triggered.push({
          id: img.id,
          imageUrl: img.imageUrl,
          description: img.description,
        });
        break; // Don't add the same image multiple times
      }
    }
  }

  return triggered;
}
