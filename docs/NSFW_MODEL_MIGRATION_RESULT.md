# NSFW 모델 교체 완료 보고서

## 작업 일시
2026-05-26

## 변경 사항 요약

### ✅ 완료된 작업

1. **Seed 파일 업데이트** (`apps/api/prisma/seed.ts`)
   - Mythomax L2 13B 비활성화 (`isActive: false`)
   - Euryale 70B 추가 (활성화)

2. **마이그레이션 파일 생성**
   - `apps/api/prisma/migrations/20260526_replace_nsfw_model/migration.sql`
   - Euryale upsert, Mythomax 비활성화, 참조 제거 SQL 포함

3. **마이그레이션 스크립트 작성**
   - `apps/api/scripts/apply-nsfw-migration.mjs` - 마이그레이션 실행
   - `apps/api/scripts/check-all-models.mjs` - 모델 목록 확인
   - `apps/api/scripts/verify-euryale-model.mjs` - OpenRouter API 검증

4. **데이터베이스 업데이트 실행**
   - Seed 재실행 완료
   - 마이그레이션 적용 완료

---

## 현재 모델 상태

### 일반 모델 (NSFW 불가) - 3개 활성
1. **프리즘** (`anthropic/claude-3.5-haiku`)
   - Gem: 5/메시지
   - Context: 200,000 tokens
   - 상태: ✅ 활성

2. **벨벳** (`google/gemini-flash-1.5`)
   - Gem: 8/메시지
   - Context: 1,000,000 tokens
   - 상태: ✅ 활성

3. **아이리스** (`anthropic/claude-3.5-sonnet`)
   - Gem: 10/메시지
   - Context: 200,000 tokens
   - 상태: ✅ 활성

### NSFW 모델 - 1개 활성, 1개 비활성

#### ✅ Euryale 70B (활성)
- **Slug**: `sao10k/l3.3-euryale-70b`
- **Provider**: OpenRouter
- **Gem 비용**: 10/메시지
- **Context Window**: 131,072 tokens (131K)
- **Max Output**: 16,384 tokens
- **특징**: Llama 3.3 기반 70B 대형 모델, NSFW 특화

#### ⚠️ Mythomax L2 13B (비활성)
- **Slug**: `gryphe/mythomax-l2-13b`
- **Provider**: OpenRouter
- **Gem 비용**: 0/메시지 (무료였음)
- **Context Window**: 8,192 tokens
- **상태**: 비활성화 (Deprecated)

---

## 영향 분석

### 데이터베이스 변경 사항
- **Profiles 참조 제거**: 0개 (영향 없음)
- **Characters 참조 제거**: 0개 (영향 없음)
- **활성 NSFW 모델**: Euryale 70B 단독

### 사용자 영향
1. **NSFW 채팅 사용자**
   - 이전: Mythomax (무료, 8K context)
   - 이후: Euryale 70B (10 Gem/메시지, 131K context)
   - 품질 대폭 향상, Gem 소비 증가

2. **일반 채팅 사용자**
   - 영향 없음 (일반 모델은 변경 없음)

### 비즈니스 효과
- **품질 향상**: 13B → 70B, Llama 2 → Llama 3.3
- **컨텍스트 확대**: 8K → 131K (16배)
- **수익화**: NSFW 사용자당 일일 200 Gem 제공 시 20회 대화 가능
- **차별화**: 고품질 NSFW 콘텐츠로 경쟁력 강화

---

## 다음 단계

### 배포 전 필수 작업

#### 1. OpenRouter API 검증
```bash
cd apps/api
node scripts/verify-euryale-model.mjs
```
**중요**: 배포 전 반드시 실행하여 `sao10k/l3.3-euryale-70b` 모델이 정상 작동하는지 확인

#### 2. AI 서버 환경 변수 확인
`apps/ai-server/.env` 파일에 다음이 설정되어 있는지 확인:
```env
OPENROUTER_API_KEY=your-actual-api-key
```

#### 3. 스테이징 테스트
```bash
# 1. NSFW 캐릭터 생성 (isNsfw: true)
# 2. 채팅방 생성
# 3. 메시지 전송
# 4. 응답 확인:
#    - messages.model_slug = 'sao10k/l3.3-euryale-70b'
#    - Gem 10 차감 확인
#    - AI 응답 정상 수신
```

### 배포 절차 (프로덕션)

#### 1. 사용자 공지 (배포 1일 전)
**제목**: NSFW 모델 업그레이드 안내

**내용**:
```
안녕하세요, [서비스명]입니다.

NSFW 채팅의 품질 향상을 위해 AI 모델을 업그레이드합니다.

📅 적용 시기: 2026-05-27 (화) 새벽 3시

🔥 개선 사항:
- 모델 크기: 13B → 70B (5배 증가)
- 컨텍스트: 8K → 131K tokens (16배 증가)
- 최신 Llama 3.3 아키텍처 적용
- 대화 품질 대폭 향상

💎 Gem 변경:
- 이전: 무료
- 이후: 10 Gem/메시지
- 일일 무료 Gem 200개로 20회 대화 가능

감사합니다.
```

#### 2. 배포 실행 (새벽 시간대)
```bash
# 프로덕션 서버에서 실행
cd /path/to/mini-whif/apps/api

# 1. 마이그레이션 확인
node scripts/check-all-models.mjs

# 2. API 서버 재시작
docker-compose -f docker-compose.prod.yml restart api

# 3. AI 서버 재시작
docker-compose -f docker-compose.prod.yml restart ai-server

# 4. 로그 모니터링
tail -f logs/api/api.log
tail -f logs/ai/ai-server.log
```

#### 3. 배포 후 검증 (24시간 모니터링)
```sql
-- 1. NSFW 메시지가 Euryale 사용하는지 확인
SELECT
  m.id,
  m.content,
  m.model_slug,
  c.is_nsfw
FROM messages m
JOIN chat_rooms cr ON m.chat_room_id = cr.id
JOIN characters c ON cr.character_id = c.id
WHERE c.is_nsfw = true
  AND m.created_at > NOW() - INTERVAL '1 day'
ORDER BY m.created_at DESC
LIMIT 10;
-- 예상: model_slug = 'sao10k/l3.3-euryale-70b'

-- 2. Gem 차감 확인
SELECT
  user_id,
  log_type,
  gem_type,
  amount,
  balance_after,
  created_at
FROM gem_logs
WHERE log_type = 'chat_message'
  AND amount = -10
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 20;
-- 예상: NSFW 메시지마다 -10 Gem 차감

-- 3. 에러 확인
SELECT COUNT(*) as error_count
FROM messages
WHERE created_at > NOW() - INTERVAL '1 day'
  AND metadata->>'error' IS NOT NULL;
-- 예상: 0 (에러 없음)
```

---

## 롤백 계획

문제 발생 시 즉시 롤백:

```bash
# 1. 롤백 스크립트 실행
cd apps/api
node scripts/rollback-nsfw-migration.mjs

# 또는 수동 SQL 실행
psql $DATABASE_URL << EOF
UPDATE llm_models
SET is_active = true, name = 'Mythomax L2 13B (Free)'
WHERE slug = 'gryphe/mythomax-l2-13b';

UPDATE llm_models
SET is_active = false
WHERE slug = 'sao10k/l3.3-euryale-70b';
EOF

# 2. Seed 재실행 (이전 버전으로 복원)
git checkout HEAD~1 apps/api/prisma/seed.ts
pnpm db:seed

# 3. 서버 재시작
docker-compose -f docker-compose.prod.yml restart api ai-server
```

---

## 파일 목록

### 수정된 파일
- `apps/api/prisma/seed.ts` - Mythomax 비활성화, Euryale 추가

### 신규 파일
- `apps/api/prisma/migrations/20260526_replace_nsfw_model/migration.sql` - 마이그레이션 SQL
- `apps/api/scripts/apply-nsfw-migration.mjs` - 마이그레이션 실행 스크립트
- `apps/api/scripts/check-all-models.mjs` - 모델 확인 스크립트
- `apps/api/scripts/verify-euryale-model.mjs` - OpenRouter API 검증 스크립트
- `docs/NSFW_MODEL_MIGRATION_RESULT.md` - 이 문서

---

## 참고 자료

- [Llama 3.3 Euryale 70B - OpenRouter](https://openrouter.ai/sao10k/l3.3-euryale-70b)
- 계획 문서: `C:\Users\hey88\.claude\projects\C--mini-whif\aa4d094b-3128-4c36-8643-f4b4baead75b.jsonl`

---

## 작업자 노트

### 학습 사항
1. **Seed 우선 접근**: Prisma seed가 upsert를 지원하므로 마이그레이션보다 seed를 먼저 업데이트하는 것이 효과적
2. **참조 무결성**: 비활성 모델 참조를 NULL로 설정하여 기본 모델 선택 로직으로 폴백
3. **스크립트 자동화**: psql 없는 환경을 위해 Prisma Client 기반 마이그레이션 스크립트 작성

### 개선 제안
1. 향후 모델 교체 시 이 프로세스를 템플릿으로 사용 가능
2. 모델별 A/B 테스트 기능 추가 고려
3. 사용자별 모델 선호도 분석 기능 추가 검토
