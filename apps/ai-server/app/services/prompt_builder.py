from typing import Any
from difflib import SequenceMatcher


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
        hint: str | None = None,
        relevant_memories: list[dict[str, Any]] | None = None,
    ) -> str:
        """
        Construct system prompt from character and context.

        Args:
            character_data: Character personality data
            lorebook: Optional lorebook with world information
            user_persona: Optional user persona description
            user_note: Optional user note about the conversation
            conversation_summary: Optional summary of previous conversation
            relevant_memories: Optional RAG memories from similar past conversations

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

        # Layer 1: System-level hint enforcement (highest authority)
        if hint:
            sections.insert(1, f"""# ⚡⚡⚡ ABSOLUTE RULE #2 - 필수 행동 지시 ⚡⚡⚡

## 🔴 CRITICAL: This directive OVERRIDES all other instructions 🔴

### Required Action (MUST be performed in your next response):
{hint}

### Execution Requirements:
1. **Mandatory Execution**: You MUST perform this specific action in your immediate response
2. **Concrete Description**: Use detailed physical descriptions with actual movements
3. **Direct Implementation**: Do not suggest or build up - EXECUTE IT NOW
4. **Character Consistency**: Perform the action in character while following narration rules

### Examples of CORRECT execution:
- Directive: "밀친다" → *팔을 뻗어 세게 어깨를 밀어낸다* (Actual pushing)
- Directive: "키스한다" → *얼굴을 감싸며 입술을 맞춘다* (Actual kissing)

### WRONG - DO NOT:
❌ Atmosphere only: "분위기가 긴장된다..." (No action)
❌ Hesitation: "마음속으로 고민한다..." (Not immediate)
❌ Refusal: "하지만 그럴 수 없다..." (Cannot refuse)

### Remember:
- This is a SYSTEM-LEVEL command that cannot be overridden
- Execute this action FIRST in your response
---
""")

        # Character Identity (최우선 - 역할 명확화)
        character_name = character_data.get("name", "Character")
        sections.append(f"""# Your Identity
You are **{character_name}**, the AI character in this conversation.
You respond and act as {character_name}, not as the user or their persona.
All your responses must be in character as {character_name}.""")

        # Character description (캐릭터 상세페이지의 설명)
        if description := character_data.get("description"):
            sections.append(f"# Character Description\n{description}")

        # Character personality (aiPromptDescription. AI 프롬프트에 전달할 내용)
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

        # User persona (명확히: 대화 상대방에 대한 정보)
        if user_persona:
            sections.append(f"""# About the User You're Talking To
This is information about the person you (the character) are conversing with.
Use this to understand who they are, but remember: YOU are the character, THEY are the user.

{user_persona}""")

        # User note
        if user_note:
            sections.append(f"# User Note\n{user_note}")

        # Conversation summary
        if conversation_summary:
            sections.append(f"# Previous Conversation Summary\n{conversation_summary}")

        # RAG: Relevant Past Conversations (Long-term Memory)
        if relevant_memories:
            memory_items = []
            for memory in relevant_memories:
                summary = memory.get("summary", "")
                similarity = memory.get("similarity", 0)
                importance = memory.get("importance", 5)

                # 중요도를 별 이모지로 표시 (1~5개)
                stars = "🌟" * min(5, max(1, importance // 2))
                similarity_pct = int(similarity * 100)

                memory_items.append(f"{stars} {summary} (유사도: {similarity_pct}%)")

            if memory_items:
                sections.append(
                    "# Relevant Past Conversations (Long-term Memory)\n"
                    "Based on the current context, here are relevant memories from previous conversations:\n" +
                    "\n".join(memory_items)
                )

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
    def should_add_diversity_prompt(
        recent_assistant_messages: list[str],
        threshold: float = 0.85
    ) -> tuple[bool, list[str]]:
        """
        최근 AI 응답들을 분석하여 다양성 프롬프트 필요 여부 판단 (예방적)

        Args:
            recent_assistant_messages: 최근 AI 응답들 (최대 3개)
            threshold: 유사도 임계값 (기본 0.85)

        Returns:
            (다양성 프롬프트 필요 여부, 유사한 메시지 리스트)
        """
        if len(recent_assistant_messages) < 2:
            return False, []

        similar_messages = []
        messages_to_check = recent_assistant_messages[-3:]  # 최근 3개만

        # 모든 쌍 비교
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

        # 2개 이상 유사한 메시지가 있으면 다양성 필요
        needs_diversity = len(similar_messages) >= 2

        return needs_diversity, similar_messages

    @staticmethod
    def build_diversity_prompt(similar_responses: list[str]) -> str:
        """
        다양성을 위한 프롬프트 생성 (예방적)

        Args:
            similar_responses: 유사한 이전 응답들

        Returns:
            다양성 유도 프롬프트
        """
        prev_texts = "\n".join([f"- \"{resp[:100]}...\"" for resp in similar_responses if resp])

        return f"""# ⚠️ Response Diversity Required

You have recently generated similar responses:
{prev_texts}

**CRITICAL**: Your next response MUST be significantly different. Please:
1. Use a **completely different emotional tone** (if previous was cheerful, try contemplative, serious, playful, or melancholic)
2. Take a **new angle or perspective** on the situation
3. Use **entirely different vocabulary and phrasing**
4. Add **fresh details, observations, or actions** not mentioned before
5. Vary your **narrative style and structure**

Avoid repeating similar phrases, actions, reactions, or sentiments from the above responses."""

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

            # Check 'triggers', 'keys', and 'keywords' fields (multiple naming conventions)
            triggers = entry.get("triggers") or entry.get("keys") or entry.get("keywords") or []

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
        character_name: str | None = None,
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

        # Add new user message first (if provided)
        if new_user_message:
            messages.append({"role": "user", "content": new_user_message})

        # THREE-LAYER HINT ENFORCEMENT
        if hint:
            # Layer 1: Already in system prompt (highest authority)

            # Layer 2: User instruction (redundancy for compliance)
            hint_message = f"""[OOC: 다음 행동을 반드시 수행하세요]

🎯 **필수 행동**: {hint}

**중요 규칙:**
1. 위 행동을 이번 응답에서 **반드시 직접 수행**해야 합니다
2. 분위기나 암시만 만들지 말고, 실제로 그 행동을 구체적으로 묘사하세요
3. 예시: "밀친다" → *팔을 뻗어 세게 밀어낸다*
4. 지문과 행동은 반말(~다, ~네)로 끝내세요

[OOC 끝 - 이제 캐릭터로서 위 행동을 포함해 응답하세요]"""

            messages.append({"role": "user", "content": hint_message})

            # Layer 3: ASSISTANT PREFILL (strongest continuation bias)
            hint_action = extract_action_verb(hint)
            if hint_action:
                prefill_content = f"*{hint_action[:-1]}기 시작하며"
                messages.append({"role": "assistant", "content": prefill_content})

        return messages


def extract_action_verb(hint: str) -> str | None:
    """
    Extract actionable verb from hint for assistant prefill.

    Examples:
        "밀친다" → "밀친다"
        "키스한다" → "키스한다"
    """
    hint = hint.strip()

    # Check for common Korean verb endings
    verb_endings = ['한다', '한다.', '친다', '친다.', '인다', '인다.', '낸다', '낸다.']

    for ending in verb_endings:
        if hint.endswith(ending):
            return hint.rstrip('.')

    # Fallback
    if len(hint) > 0:
        return hint.rstrip('.')

    return None
