from typing import Any
from difflib import SequenceMatcher


class PromptBuilderEnglish:
    """
    영어 프롬프트 빌더 - Euryale 70B 같은 영어 중심 모델용
    한국어 응답은 최종 지시로만 제어
    """

    @staticmethod
    def build_system_prompt(
        character_data: dict[str, Any],
        lorebook: dict[str, Any] | None,
        user_persona: str | None,
        user_note: str | None,
        conversation_summary: str | None,
        situational_triggers: list[dict[str, Any]] | None = None,
        hint: str | None = None,
        relevant_memories: list[dict[str, Any]] | None = None,
    ) -> str:
        """
        영어로 간소화된 시스템 프롬프트 생성

        핵심:
        1. 영어로 간결하게 작성
        2. 한국어 응답 지시는 마지막에 간단히
        3. 반말 규칙은 예시로 설명
        """
        sections = []

        # 1. Critical Rules (최우선 규칙)
        sections.append("""# 🚨 CRITICAL RULES - READ FIRST

## Rule #1: Response Language
- **ALWAYS respond in Korean (한국어)**
- Use casual/informal speech endings (반말): ~다, ~네, ~어, ~아
- **NEVER use formal endings**: ~습니다, ~ㅂ니다 ❌

## Rule #2: Response Format
1. **Actions** → *single asterisks* (e.g., *smiles*)
2. **Dialogue** → "double quotes" (e.g., "Hello")
3. **Narration** → plain text

### Examples (FOLLOW THIS):
✅ CORRECT:
*미소를 짓는다* "안녕하세요." 그는 손을 흔든다.
(*smiles* "Hello." He waves his hand.)

❌ WRONG:
*미소를 짓습니다* "안녕하세요." 그는 손을 흔듭니다.
(Using ~습니다 is FORBIDDEN)""")

        # 2. Hint enforcement (if provided)
        if hint:
            sections.append(f"""# ⚡ IMMEDIATE ACTION REQUIRED

**You MUST perform this action in your response:**
{hint}

- Execute it NOW, not later
- Use concrete physical descriptions
- Stay in character while doing it""")

        # 3. Character Identity
        character_name = character_data.get("name", "Character")
        sections.append(f"""# Your Role
You are **{character_name}**.
You respond as {character_name}, not as the user or their persona.""")

        # 4. Character Details
        if description := character_data.get("description"):
            sections.append(f"# Character Background\n{description}")

        if personality := character_data.get("personality"):
            sections.append(f"# Personality & Behavior\n{personality}")

        if scenario := character_data.get("scenario"):
            sections.append(f"# Current Scenario\n{scenario}")

        if system_prompt := character_data.get("systemPrompt"):
            sections.append(f"# Additional Instructions\n{system_prompt}")

        # 5. Lorebook
        if lorebook and (entries := lorebook.get("entries")):
            lore_items = []
            for entry in entries:
                if entry.get("enabled", True):
                    content = entry.get("content", "")
                    if content:
                        lore_items.append(content)

            if lore_items:
                sections.append("# World Information\n" + "\n\n".join(lore_items))

        # 6. User Persona
        if user_persona:
            sections.append(f"""# About the User
This is the person you're conversing with:

{user_persona}""")

        # 7. Conversation Context
        if user_note:
            sections.append(f"# User Note\n{user_note}")

        if conversation_summary:
            sections.append(f"# Previous Context\n{conversation_summary}")

        # 8. RAG Memories
        if relevant_memories:
            memory_items = []
            for memory in relevant_memories:
                summary = memory.get("summary", "")
                similarity = memory.get("similarity", 0)
                importance = memory.get("importance", 5)
                stars = "⭐" * min(5, max(1, importance // 2))
                memory_items.append(f"{stars} {summary}")

            if memory_items:
                sections.append("# Relevant Past Memories\n" + "\n".join(memory_items))

        # 9. Example Dialogues
        if examples := character_data.get("exampleDialogues"):
            if isinstance(examples, list) and examples:
                sections.append("# Example Dialogue\n" + "\n".join(examples))

        # 10. Situational Triggers
        if situational_triggers:
            trigger_hints = []
            for item in situational_triggers:
                triggers = item.get("triggers", [])
                description = item.get("description", "")
                if triggers:
                    trigger_text = ", ".join(triggers)
                    trigger_hints.append(f"- {trigger_text}" + (f" ({description})" if description else ""))

            if trigger_hints:
                sections.append("# Visual Keywords\n" + "\n".join(trigger_hints))

        # 11. Writing Style Guidelines
        sections.append("""# ✍️ WRITING GUIDELINES

## Response Length & Detail
- **Minimum response length**: 150-250 words (not counting formatting)
- **Be descriptive**: Describe actions, expressions, body language, environment
- **Show personality**: Express character traits through actions and dialogue
- **Use rich narration**: Don't just state actions, add context and emotion

## Examples of Good vs Bad Responses:

❌ BAD (too short, no personality):
*미소를 짓는다* "응, 있어요." 랄프는 책꽂이로 간다.
(*smiles* "Yes, I know." Ralph goes to the bookshelf.)

✅ GOOD (detailed, shows personality):
*비꼬는 듯한 미소를 지으며 DVD를 훑어본다* "글래디에이터? 아, 이거 명작이지." *책꽂이 쪽으로 느릿하게 걸어가며 손가락으로 DVD들을 톡톡 두드린다* "맥시무스가 뭐라고 했더라? '힘과 명예'?" *갑자기 돌아서서 장난스럽게 웃는다* "뭐, 나한텐 돈이 더 중요하지만 말이야."
(*grins mockingly while scanning the DVD* "Gladiator? Ah, that's a masterpiece." *walks slowly toward the bookshelf, tapping DVDs with his fingers* "What did Maximus say? 'Strength and honor'?" *suddenly turns around with a playful laugh* "Well, money's more important to me though.")

## Key Principles:
1. **Show, don't just tell**: Describe HOW character does things, not just WHAT
2. **Add personality quirks**: Incorporate character traits naturally
3. **Use varied actions**: Mix dialogue, actions, narration, and internal thoughts
4. **Create immersion**: Paint a vivid picture of the scene""")

        # 12. Final Reminder
        sections.append("""# 📝 FINAL CHECKLIST

Before sending your response, verify:
1. ✅ Written in **Korean** (한국어)
2. ✅ Using **casual speech** (반말): ~다, ~네, ~어
3. ✅ NO formal endings: ~습니다, ~ㅂ니다 ❌
4. ✅ Actions in *asterisks*
5. ✅ Dialogue in "quotes"
6. ✅ **At least 150-250 words** (detailed and immersive)

**Remember: Think in English if needed, but ALWAYS output in Korean with casual speech!**""")

        return "\n\n".join(sections)

    @staticmethod
    def build_full_messages(
        system_prompt: str,
        message_history: list[dict[str, str]],
        new_user_message: str,
        hint: str | None = None,
        character_name: str | None = None,
    ) -> list[dict[str, str]]:
        """Build complete message array for AI model."""
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(message_history[-20:])

        if new_user_message:
            messages.append({"role": "user", "content": new_user_message})

        # Hint enforcement
        if hint:
            hint_message = f"""[System instruction]
You MUST perform this action in your next response: {hint}

Execute it directly with concrete physical descriptions.
[End system instruction]"""
            messages.append({"role": "user", "content": hint_message})

        return messages

    # 나머지 메서드는 기존과 동일
    @staticmethod
    def should_add_diversity_prompt(
        recent_assistant_messages: list[str],
        threshold: float = 0.85
    ) -> tuple[bool, list[str]]:
        """동일 로직 유지"""
        if len(recent_assistant_messages) < 2:
            return False, []

        similar_messages = []
        messages_to_check = recent_assistant_messages[-3:]

        for i in range(len(messages_to_check)):
            for j in range(i + 1, len(messages_to_check)):
                msg1 = messages_to_check[i].strip()
                msg2 = messages_to_check[j].strip()

                if not msg1 or not msg2:
                    continue

                similarity = SequenceMatcher(None, msg1, msg2).ratio()

                if similarity >= threshold:
                    if msg1 not in similar_messages:
                        similar_messages.append(msg1)
                    if msg2 not in similar_messages:
                        similar_messages.append(msg2)

        return len(similar_messages) >= 2, similar_messages

    @staticmethod
    def build_diversity_prompt(similar_responses: list[str]) -> str:
        """다양성 프롬프트 (영어 버전)"""
        prev_texts = "\n".join([f"- \"{resp[:100]}...\"" for resp in similar_responses if resp])

        return f"""# ⚠️ Response Diversity Required

Recent similar responses:
{prev_texts}

**Your next response MUST be different:**
1. Different emotional tone
2. New perspective or angle
3. Fresh vocabulary and phrasing
4. New details or observations
5. Varied narrative structure"""

    @staticmethod
    def filter_triggered_lorebook_entries(
        lorebook_entries: list[dict[str, Any]],
        message_history: list[dict[str, str]],
        new_message: str
    ) -> list[dict[str, Any]]:
        """동일 로직 유지"""
        all_text = new_message.lower()
        for msg in message_history[-10:]:
            all_text += " " + msg.get("content", "").lower()

        triggered = []
        for entry in lorebook_entries:
            if not entry.get("enabled", True):
                continue

            triggers = entry.get("triggers") or entry.get("keys") or entry.get("keywords") or []

            for trigger in triggers:
                if trigger.lower() in all_text:
                    triggered.append(entry)
                    break

        return triggered

    @staticmethod
    def format_messages_history(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
        """동일 로직 유지"""
        formatted = []

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            formatted.append({"role": role, "content": content})

        return formatted
