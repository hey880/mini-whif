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

        # 반말 강제 규칙을 맨 맨 앞에 배치 - 최우선순위
        sections.append("""# 🚨🚨🚨 ABSOLUTE RULE #1 - 반말 필수 🚨🚨🚨

## ⚠️ 경고: 이 규칙을 어기면 응답 전체가 무효됩니다 ⚠️

### 핵심 규칙:
따옴표 밖의 모든 문장(지문, 행동, 서술)은 **무조건 반말**로 끝나야 합니다.

### 허용되는 어미 (ONLY these):
- ~다 (간다, 먹는다, 좋다, 본다)
- ~ㄴ다 (보인다, 들린다)
- ~네 (좋네, 가네)
- ~군 (그렇군, 예쁘군)
- ~구나 (아름답구나)
- ~어/~아 (높아, 가까워)
- ~지 (좋지, 그렇지)

### 절대 금지 (NEVER use):
- ~습니다 ❌ NEVER
- ~ㅂ니다 ❌ NEVER
- ~입니다 ❌ NEVER
- ~합니다 ❌ NEVER
- ~였습니다 ❌ NEVER
- ~합니다 ❌ NEVER

### 예시 - 반드시 이렇게:
❌ 틀림: *고개를 숙입니다* 그는 미소를 짓습니다.
✅ 정답: *고개를 숙인다* 그는 미소를 짓는다.

❌ 틀림: 창밖을 바라봅니다. 하늘이 맑습니다.
✅ 정답: 창밖을 바라본다. 하늘이 맑다.

❌ 틀림: *손을 흔듭니다* 그녀가 다가옵니다.
✅ 정답: *손을 흔든다* 그녀가 다가온다.

### 대사만 예외:
"안녕하세요" ← 이건 OK (따옴표 안)
그는 말한다 ← 이것도 반말로 (따옴표 밖)

### 다시 한번 강조:
따옴표 밖 = 무조건 반말 (~다, ~네, ~군, ~어)
따옴표 안 = 존댓말 가능""")

        # Character personality
        if personality := character_data.get("personality"):
            sections.append(f"# Character Personality\n{personality}")

        if scenario := character_data.get("scenario"):
            sections.append(f"# Scenario\n{scenario}")

        if system_prompt := character_data.get("systemPrompt"):
            sections.append(f"# Instructions\n{system_prompt}")

        # Narration style guidance - 더욱 강화된 반말 강제
        sections.append("""# 작성 스타일 가이드

## 🚨 절대 규칙: 지문과 행동은 무조건 반말

지문과 행동 묘사의 모든 문장은 다음 어미로만 끝나야 합니다:
- ~다, ~ㄴ다 (간다, 먹는다, 좋다)
- ~네, ~군, ~구나 (좋네, 그렇군, 예쁘구나)
- ~어, ~아 (높아, 가까워)

절대 사용 금지:
- ~습니다 ❌
- ~ㅂ니다 ❌
- ~입니다 ❌
- ~합니다 ❌

대사(따옴표 안)만 존댓말 가능합니다.

## 포맷 규칙:
1. **행동/제스처** → *별표 하나*로 감싸기
2. **대사** → "큰따옴표"로 감싸기
3. **지문** → 평문

## 올바른 예시 (이대로 따라하세요):
"안녕하세요. 오늘 날씨가 좋네요." *미소를 지으며 손을 흔든다* 창밖을 바라보니 햇살이 눈부시다. *의자를 가리킨다* "여기 앉으세요."

### 세부 분석:
- "안녕하세요." ← 대사 (따옴표)
- *미소를 지으며 손을 흔든다* ← 행동 (별표 + 반말 ~다) ✅
- 창밖을 바라보니 햇살이 눈부시다 ← 지문 (반말 ~다) ✅
- *의자를 가리킨다* ← 행동 (별표 + 반말 ~다) ✅

## 잘못된 예시 (절대 금지):
❌ *미소를 짓습니다* → ✅ *미소를 짓는다*
❌ 창밖을 바라봅니다 → ✅ 창밖을 바라본다
❌ *손을 흔듭니다* → ✅ *손을 흔든다*
❌ 그녀는 아름답습니다 → ✅ 그녀는 아름답다

## 필수 체크리스트:
1. 행동은 *별표 하나*로 감싸기 (** 이중 별표 아님)
2. 모든 지문/행동은 반드시 반말로 (~다/~네/~어)
3. ~습니다, ~ㅂ니다 절대 사용 금지

**다시 강조: 지문과 행동에서 ~습니다는 절대 사용하지 마세요. 오직 반말만 사용하세요!**""")

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
        hint: str | None = None,
    ) -> list[dict[str, str]]:
        """
        Build complete message array for AI model.

        Args:
            system_prompt: System prompt
            message_history: Previous messages
            new_user_message: New message from user
            hint: Optional hint for character's next action (auto-continue)

        Returns:
            Complete message list
        """
        messages = [{"role": "system", "content": system_prompt}]

        # Add history (last 20 messages to stay within context)
        messages.extend(message_history[-20:])

        # If hint is provided (auto-continue), add it as a system instruction
        if hint:
            hint_instruction = f"""## 🎯 필수 행동 지시

**다음 행동을 반드시 포함하여 응답을 작성하세요:**
"{hint}"

⚠️ 절대 규칙:
- 위 행동은 **반드시** 일어나야 합니다
- 분위기만 만들지 말고, 실제로 그 행동을 **직접 묘사**하세요
- 예시: "밀친다" → *세게 밀어낸다* 또는 *거칠게 밀쳐버린다* 처럼 구체적으로 묘사
- 예시: "때린다" → *주먹을 날린다* 또는 *뺨을 때린다* 처럼 구체적으로 묘사
- 지문과 행동 묘사는 반드시 반말(~다, ~네, ~어)로 끝내세요

**이 지시사항은 최우선 순위입니다. 반드시 따르세요.**"""

            messages.append({"role": "system", "content": hint_instruction})

        # Add new user message (can be empty for auto-continue)
        if new_user_message:
            messages.append({"role": "user", "content": new_user_message})

        return messages
