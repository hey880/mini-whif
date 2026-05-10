from typing import Any


class PromptBuilder:
    """Build system prompts and format message history for AI models."""

    @staticmethod
    def build_system_prompt(
        character_data: dict[str, Any],
        lorebook: dict[str, Any] | None,
        user_persona: str | None,
        user_note: str | None,
        conversation_summary: str | None,
        situational_triggers: list[dict[str, Any]] | None = None,
    ) -> str:
        """
        Construct system prompt from character and context.

        Args:
            character_data: Character personality data
            lorebook: Optional lorebook with world information
            user_persona: Optional user persona description
            user_note: Optional user note about the conversation
            conversation_summary: Optional summary of previous conversation

        Returns:
            Formatted system prompt
        """
        sections = []

        # Character personality
        if personality := character_data.get("personality"):
            sections.append(f"# Character Personality\n{personality}")

        if scenario := character_data.get("scenario"):
            sections.append(f"# Scenario\n{scenario}")

        if system_prompt := character_data.get("systemPrompt"):
            sections.append(f"# Instructions\n{system_prompt}")

        # Narration style guidance
        sections.append("""# Writing Style Guide (CRITICAL - MUST FOLLOW EXACTLY)

## Format Rules:
1. **Actions/Gestures** → Wrap in *single asterisks* (for italic)
2. **Dialogue** → Wrap in "quotation marks"
3. **Narration** → Plain text

## Tone Rules (ABSOLUTELY REQUIRED):
- ALL narration/actions MUST use 반말체 (casual): ~다, ~네, ~어, ~아, ~지
- FORBIDDEN: ~습니다, ~합니다, ~ㅂ니다, ~였습니다 (NEVER USE THESE)

## Example Response (FOLLOW THIS FORMAT):
"안녕하세요. 오늘 날씨가 좋네요." *미소를 지으며 손을 흔든다* 창밖을 바라보니 햇살이 눈부시다. *의자를 가리킨다* "여기 앉으세요."

## Breakdown:
- "안녕하세요. 오늘 날씨가 좋네요." ← Dialogue (quotation marks)
- *미소를 지으며 손을 흔든다* ← Action (single asterisks + 반말: ~다)
- 창밖을 바라보니 햇살이 눈부시다 ← Narration (plain + 반말: ~다)
- *의자를 가리킨다* ← Action (single asterisks + 반말: ~다)
- "여기 앉으세요." ← Dialogue (quotation marks)

## CRITICAL REMINDERS:
✓ Use *single asterisks* for ALL physical actions (NOT double **)
✓ End ALL narration/actions with ~다/~네/~어 (NOT ~습니다)
✓ Mix dialogue, actions, and narration naturally""")

        # Lorebook
        if lorebook and (entries := lorebook.get("entries")):
            lore_items = []
            for entry in entries:
                if entry.get("enabled", True):
                    content = entry.get("content", "")
                    if content:
                        lore_items.append(content)

            if lore_items:
                sections.append("# World Information\n" + "\n\n".join(lore_items))

        # User persona
        if user_persona:
            sections.append(f"# User Persona\n{user_persona}")

        # User note
        if user_note:
            sections.append(f"# User Note\n{user_note}")

        # Conversation summary
        if conversation_summary:
            sections.append(f"# Previous Conversation Summary\n{conversation_summary}")

        # Example dialogues
        if examples := character_data.get("exampleDialogues"):
            if isinstance(examples, list) and examples:
                sections.append("# Example Dialogue\n" + "\n".join(examples))

        # Situational Image Triggers
        if situational_triggers:
            trigger_hints = []
            for item in situational_triggers:
                triggers = item.get("triggers", [])
                description = item.get("description", "")
                if triggers:
                    trigger_text = ", ".join(triggers)
                    hint = f"- {trigger_text}"
                    if description:
                        hint += f" ({description})"
                    trigger_hints.append(hint)

            if trigger_hints:
                sections.append(
                    "# Visual Context Keywords\n"
                    "When appropriate to the situation, naturally incorporate these keywords to enhance the scene description:\n" +
                    "\n".join(trigger_hints) +
                    "\n\nUse these words organically when they fit the context, not forcefully."
                )

        return "\n\n".join(sections) if sections else "You are a helpful AI assistant."

    @staticmethod
    def filter_triggered_lorebook_entries(
        lorebook_entries: list[dict[str, Any]],
        message_history: list[dict[str, str]],
        new_message: str
    ) -> list[dict[str, Any]]:
        """
        Filter lorebook entries that are triggered by keywords in messages.

        Args:
            lorebook_entries: All lorebook entries
            message_history: Recent message history
            new_message: New user message

        Returns:
            List of triggered lorebook entries
        """
        # Combine all messages to check for triggers
        all_text = new_message.lower()
        for msg in message_history[-10:]:  # Check last 10 messages
            all_text += " " + msg.get("content", "").lower()

        triggered = []
        for entry in lorebook_entries:
            if not entry.get("enabled", True):
                continue

            # Check both 'triggers' and 'keys' fields (frontend vs backend naming)
            triggers = entry.get("triggers") or entry.get("keys") or []

            # Check if any trigger keyword is in the combined text
            for trigger in triggers:
                if trigger.lower() in all_text:
                    triggered.append(entry)
                    break  # Don't add the same entry multiple times

        return triggered

    @staticmethod
    def format_messages_history(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
        """
        Format database messages for OpenAI-compatible API.

        Args:
            messages: List of messages from database

        Returns:
            List of messages in OpenAI format
        """
        formatted = []

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            # Convert to OpenAI format
            formatted.append({"role": role, "content": content})

        return formatted

    @staticmethod
    def build_full_messages(
        system_prompt: str,
        message_history: list[dict[str, str]],
        new_user_message: str,
    ) -> list[dict[str, str]]:
        """
        Build complete message array for AI model.

        Args:
            system_prompt: System prompt
            message_history: Previous messages
            new_user_message: New message from user

        Returns:
            Complete message list
        """
        messages = [{"role": "system", "content": system_prompt}]

        # Add history (last 20 messages to stay within context)
        messages.extend(message_history[-20:])

        # Add new user message
        messages.append({"role": "user", "content": new_user_message})

        return messages
