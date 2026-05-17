# 부하 테스트 - 빠른 시작 가이드

## 5분 설정

### 1. k6 설치

**Windows (Chocolatey)**:
```bash
choco install k6
```

**macOS**:
```bash
brew install k6
```

**설치 확인**:
```bash
k6 version
```

### 2. 의존성 설치

```bash
cd load-tests
pnpm install
```

### 3. 환경 설정

```bash
cp .env.example .env
```

`.env` 파일을 로컬 설정으로 편집:
```env
API_URL=http://localhost:3000
AI_SERVER_URL=http://localhost:8000
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DATABASE_URL=<your-database-url>
DIRECT_URL=<your-direct-database-url>
TEST_USER_EMAIL_PREFIX=loadtest-user
```

### 4. 서비스 시작

**터미널 1 - API 서버**:
```bash
cd apps/api
pnpm dev
```

**터미널 2 - AI 서버** (선택사항 - Mock 모드 사용 가능):
```bash
cd apps/ai-server
fastapi dev
```

### 5. 테스트 데이터 시딩

```bash
cd load-tests
pnpm seed
```

다음을 생성합니다:
- 자격 증명이 있는 100명의 테스트 사용자
- 10개의 테스트 캐릭터
- Gem 지갑 (각각 3200 gems)

### 6. 첫 테스트 실행

```bash
# 빠른 헬스 체크 (30초)
pnpm smoke

# 인증 플로우 테스트 (30초)
pnpm smoke:auth
```

### 7. 부하 테스트 실행

```bash
# SSE 스트리밍 테스트 (13분)
pnpm load:chat

# ConnectRPC 테스트 (13분)
pnpm load:rpc

# 혼합 워크로드 (20분)
pnpm load:mixed
```

## 예상 결과

✅ **스모크 테스트**:
- 모든 체크 ✓
- p95 지연시간 < 2초
- 에러율 < 5%
- Gem 잔액 에러 없음

✅ **부하 테스트**:
- SSE 첫 청크: p95 < 2초
- RPC 지연시간: p95 < 200ms
- 에러율 < 1%
- Gem 잔액 에러 없음

## 문제 해결

### "테스트 사용자를 찾을 수 없습니다"
```bash
pnpm seed
```

### "API가 정상이 아닙니다"
API 서버가 실행 중인지 확인:
```bash
cd apps/api
pnpm dev
curl http://localhost:3000/health
```

### "Gem이 부족합니다"
테스트 데이터 리셋:
```bash
pnpm cleanup
pnpm seed
```

### 401 인증 에러 (Rate Limiting)

**Supabase rate limiting**이 발생한 경우:

1. **10-15분 대기** - rate limit 완전 리셋 대기 (5분으로는 부족할 수 있음)
2. **토큰 캐싱 적용됨** (v2.0+):
   - 각 VU는 처음 한 번만 인증, 이후 토큰 재사용
   - 인증 요청 90% 감소
3. **최적화된 설정**:
   - VUs 감소 (10-15)
   - Think time 증가 (4-10초)
4. **여전히 에러 발생 시**:
   - 다른 날에 테스트 실행
   - 테스트 사용자 재생성: `pnpm cleanup && pnpm seed`

## 비용 효율적인 테스트 (Mock AI 모드)

OpenRouter 비용 없이 무료 테스트:

### 설정

**1. API 서버에서 OpenRouter 키 비활성화**:
```bash
cd apps/api
# .env 파일에서 OPENROUTER_API_KEY를 주석 처리
# OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

**2. AI 서버에서도 OpenRouter 키 비활성화**:
```bash
cd apps/ai-server
# .env 파일에서 OPENROUTER_API_KEY를 주석 처리
# OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

**3. 서비스 재시작**:
```bash
# 두 서버 모두 재시작 (Ctrl+C 후 다시 시작)
```

### Mock 모드 장점
- **비용**: $0
- **코드 경로**: 모든 실제 로직 실행 (인증, gem 차감, DB, SSE)
- **Mock 응답 시간**: 5-30초 스트리밍 시뮬레이션

**비용**: Mock 모드 $0 vs 실제 AI로 전체 테스트 스위트 ~$2-5

## 다음 단계

- 전체 [README.md](./README.md)에서 자세한 문서 확인
- 스트레스 테스트 시도: `pnpm stress`
- 스파이크 테스트 시도: `pnpm spike`
- `results/` 디렉토리에서 결과 검토

## 정리

테스트 후:
```bash
pnpm cleanup
```

다음을 수행합니다:
- 메시지 삭제
- 채팅방 삭제
- Gem 지갑을 초기 상태로 리셋 (3200 gems)
- 결과 아카이브

## 도움이 필요하신가요?

- 위의 문제 해결 섹션 확인
- k6 문서 검토: https://k6.io/docs/
- 전체 문서는 [README.md](./README.md) 확인
