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

        return "\n\n".join(sections) if sections else "You are a helpful AI assistant."

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
