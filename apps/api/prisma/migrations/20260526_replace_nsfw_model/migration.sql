-- NSFW 모델 교체: Mythomax L2 13B → Euryale 70B
-- 작성일: 2026-05-26
-- 목적: 고품질 NSFW 콘텐츠 제공을 위한 모델 업그레이드

-- 1. Euryale 70B 모델 추가 (upsert)
INSERT INTO llm_models (
  name,
  slug,
  provider,
  context_window,
  max_output_tokens,
  gem_cost_per_message,
  is_active,
  is_nsfw_capable,
  created_at,
  updated_at
)
VALUES (
  'Euryale 70B',
  'sao10k/l3.3-euryale-70b',
  'OpenRouter',
  131072,
  16384,
  10,
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  context_window = EXCLUDED.context_window,
  max_output_tokens = EXCLUDED.max_output_tokens,
  gem_cost_per_message = EXCLUDED.gem_cost_per_message,
  is_active = EXCLUDED.is_active,
  is_nsfw_capable = EXCLUDED.is_nsfw_capable,
  updated_at = NOW();

-- 2. Mythomax L2 13B 비활성화
UPDATE llm_models
SET
  is_active = false,
  name = 'Mythomax L2 13B (Deprecated)',
  updated_at = NOW()
WHERE slug = 'gryphe/mythomax-l2-13b';

-- 3. Mythomax 사용 중인 Profile 참조 제거
-- (사용자가 비활성 모델을 선택한 경우 NULL로 초기화 → 기본 모델 사용)
UPDATE profiles
SET
  chosen_llm_model_id = NULL,
  updated_at = NOW()
WHERE chosen_llm_model_id IN (
  SELECT id FROM llm_models WHERE slug = 'gryphe/mythomax-l2-13b'
);

-- 4. Mythomax 사용 중인 Character 참조 제거
-- (캐릭터가 비활성 모델을 지정한 경우 NULL로 초기화 → NSFW 기본 모델 사용)
UPDATE characters
SET
  default_llm_model_id = NULL,
  updated_at = NOW()
WHERE default_llm_model_id IN (
  SELECT id FROM llm_models WHERE slug = 'gryphe/mythomax-l2-13b'
);

-- 검증 쿼리 (수동 실행용)
-- SELECT * FROM llm_models WHERE is_nsfw_capable = true ORDER BY gem_cost_per_message;
-- SELECT COUNT(*) FROM profiles WHERE chosen_llm_model_id IN (SELECT id FROM llm_models WHERE slug = 'gryphe/mythomax-l2-13b');
-- SELECT COUNT(*) FROM characters WHERE default_llm_model_id IN (SELECT id FROM llm_models WHERE slug = 'gryphe/mythomax-l2-13b');
