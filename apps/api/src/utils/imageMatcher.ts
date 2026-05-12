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

  console.log('[ImageMatcher] Message content:', messageContent);
  console.log('[ImageMatcher] Situational images:', JSON.stringify(situationalImages, null, 2));

  for (const img of situationalImages) {
    console.log(`[ImageMatcher] Checking image ${img.id}:`, img.triggers);

    // Check if any trigger keyword is in the message
    for (const trigger of img.triggers) {
      const triggerLower = trigger.toLowerCase();
      if (lowerContent.includes(triggerLower)) {
        console.log(`[ImageMatcher] ✅ Triggered! Keyword "${trigger}" found in message`);
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

  console.log('[ImageMatcher] Total triggered images:', triggered.length);
  return triggered;
}
