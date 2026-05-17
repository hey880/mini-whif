# Persona Chat 부하 테스트 스위트

Persona Chat AI 서비스를 위한 k6 기반 부하 테스트로, SSE 스트리밍, Gem 경제 시스템 검증, ConnectRPC 성능 테스트를 특화 지원합니다.

## 빠른 시작

### 사전 요구사항

1. **k6 설치**:
   ```bash
   # Windows (Chocolatey)
   choco install k6

   # macOS
   brew install k6

   # Linux
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **설치 확인**:
   ```bash
   k6 version
   ```

3. **의존성 설치**:
   ```bash
   cd load-tests
   pnpm install
   ```

### 초기 설정

1. **환경 변수 설정**:
   ```bash
   cp .env.example .env
   # .env 파일을 편집하여 설정을 입력하세요
   ```

2. **서비스 시작**:
   ```bash
   # 루트 디렉토리에서
   cd apps/api
   pnpm dev  # Port 3000

   # 선택사항: AI 서버 시작 (또는 Mock 모드 사용)
   cd apps/ai-server
   fastapi dev  # Port 8000
   ```

3. **테스트 데이터베이스 시딩**:
   ```bash
   cd load-tests
   pnpm seed
   ```

   다음 작업을 수행합니다:
   - Supabase Auth에 100명의 테스트 사용자 생성
   - Gem 지갑 초기화 (각각 3200 gems)
   - 10개의 테스트 캐릭터 생성
   - `fixtures/test-users.json`에 자격 증명 저장

4. **스모크 테스트 실행**:
   ```bash
   pnpm smoke
   ```

## 테스트 스위트

### 스모크 테스트 (1-2분)

대규모 테스트 전 빠른 검증:

```bash
# 헬스 체크
pnpm smoke

# 인증 플로우
pnpm smoke:auth
```

**예상 결과**:
- ✅ 모든 체크 통과
- ✅ p95 지연시간 < 2초
- ✅ 에러율 < 5%

### 기능 검증 테스트 (10-15분) - 로컬 환경

모든 엔드포인트와 기능이 정상 작동하는지 검증합니다 (통합 테스트).
**주의**: 5-15 VUs는 기능 검증용이며, 실제 부하 테스트는 스테이징 환경 필요.

```bash
# SSE 스트리밍 기능 검증 (15 VUs)
pnpm load:chat

# ConnectRPC 기능 검증 (5 VUs)
pnpm load:rpc

# 혼합 워크로드 기능 검증 (15 VUs)
pnpm load:mixed
```

> 💡 **참고**: 스크립트 이름이 `load:*`이지만, 로컬 환경에서는 **기능 검증** 목적입니다.
> 실제 부하 테스트는 스테이징 환경에서 50-100 VUs로 실행해야 합니다.

**채팅 스트리밍 검증** (`load:chat`):
- **목적**: SSE 스트리밍 기능 정상 작동 확인
- **프로필**: 0→15 VUs (2분), 15 VUs (10분), 15→0 VUs (1분)
- **시나리오**: 사용자 인증 (토큰 캐싱), 채팅방 생성, SSE를 통해 3-5개 메시지 전송
- **주요 메트릭**:
  - SSE 연결 시간: p95 < 500ms
  - 첫 청크 지연: p95 < 2초
  - 전체 스트리밍 시간: p95 < 35초
  - Gem 잔액 오류 없음

**ConnectRPC 검증** (`load:rpc`):
- **목적**: 모든 RPC 엔드포인트 정상 작동 확인
- **프로필**: 0→5 VUs (2분), 5 VUs (10분), 5→0 VUs (1분)
- **시나리오**: CharacterService, ChatRoomService, PersonaService 호출 (7-15초 간격)
- **최적화**: VU별 토큰 캐싱으로 인증 요청 90% 감소
- **주요 메트릭**:
  - RPC 지연시간: p95 < 1.5초 (로컬 환경)
  - 에러율: < 1%

**혼합 워크로드 검증** (`load:mixed`):
- **목적**: 실제 사용자 시나리오 통합 검증
- **프로필**: 0→15 VUs (3분), 15 VUs (15분), 15→0 VUs (2분)
- **시나리오**: 실제 사용자 행동 분포:
  - 60% - AI와 채팅 (SSE 스트리밍)
  - 20% - 캐릭터 탐색
  - 10% - 페르소나 관리
  - 10% - 메시지 재생성
- **최적화**: 토큰 재사용으로 Supabase rate limit 회피
- **주요 메트릭**: 채팅 및 RPC 검증의 통합 임계값

---

### 📌 기능 검증 vs 실제 부하 테스트

| 구분 | 기능 검증 (현재) | 실제 부하 테스트 |
|------|-----------------|-----------------|
| **환경** | 로컬 개발 환경 | 스테이징/프로덕션 |
| **VUs** | 5-15 | 50-500 |
| **목적** | 엔드포인트 작동 확인 | 성능 한계 측정 |
| **실행 시점** | 개발 중, PR 전 | 배포 전, 정기 모니터링 |
| **임계값** | 관대 (p95 < 1.5초) | 엄격 (p95 < 200ms) |

**로컬 환경의 역할**:
- ✅ 모든 엔드포인트 정상 작동 확인
- ✅ 회귀 방지 (코드 변경 후)
- ✅ CI/CD 통합 (자동 검증)
- ❌ 실제 부하 시뮬레이션 (VU 수 부족)

**실제 부하 테스트는 스테이징 환경 구축 후**:
- Docker Compose로 별도 인프라
- 자체 PostgreSQL (Supabase rate limit 없음)
- 50-100 VUs로 프로덕션 트래픽 시뮬레이션

---

### 스트레스 테스트 (15-20분) - 스테이징 환경 권장

시스템 한계 찾기 (로컬 환경에서는 실행하지 마세요):

```bash
# 최대 부하 (500 VUs까지 램프업)
pnpm stress

# Gem 차감 동시성 테스트
pnpm stress:gems
```

**목표**:
- 임계점 식별
- 데이터베이스 커넥션 풀링 검증
- Gem 트랜잭션 데드락 테스트
- 리소스 고갈 모니터링

### 스파이크 테스트 (10분)

갑작스러운 트래픽 급증 시뮬레이션:

```bash
pnpm spike
```

**프로필**: 10 VUs → 200 VUs (10초) → 30초 유지 → 하강
**반복**: 3회

### Soak 테스트 (2-4시간)

장기 안정성 테스팅:

```bash
pnpm soak
```

**프로필**: 30 VUs를 2-4시간 유지
**모니터링**: 메모리 누수, 커넥션 풀 고갈, 성능 저하

## 환경 설정

### 필수 변수

```env
# API 엔드포인트
API_URL=http://localhost:3000
AI_SERVER_URL=http://localhost:8000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# 데이터베이스
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
```

### 테스트 설정

```env
# 테스트 사용자 설정
TEST_USER_COUNT=100
TEST_USER_PASSWORD=LoadTest2024!
TEST_USER_EMAIL_PREFIX=loadtest-user
```

## Mock AI 서버 모드 (무료 테스트)

비용 효율적인 테스트를 위해 Mock AI 서버 모드를 활용하세요.

### 설정 방법

**1. API 서버에서 OpenRouter 키 비활성화**:

```bash
cd apps/api
# .env 파일 수정
```

`OPENROUTER_API_KEY`를 주석 처리:
```env
# OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

**2. AI 서버에서도 OpenRouter 키 비활성화**:

```bash
cd apps/ai-server
# .env 파일 수정
```

`OPENROUTER_API_KEY`를 주석 처리:
```env
# OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

**3. 서비스 재시작**:

```bash
# API 서버 재시작
cd apps/api
pnpm dev

# AI 서버 재시작 (사용하는 경우)
cd apps/ai-server
fastapi dev
```

### Mock 모드 장점

- **비용**: $0 (OpenRouter API 호출 없음)
- **코드 경로**: 모든 실제 로직 실행 (인증, gem 차감, DB, SSE)
- **Mock 응답 시간**: 5-30초 스트리밍 시뮬레이션
- **테스트 속도**: 실제 AI보다 빠름

**비용 비교**:
- Mock 모드: $0
- 실제 AI로 전체 테스트 스위트: ~$2-5

**권장사항**: Mock 모드로 95%의 테스트를 실행하고, 주간 검증용으로만 실제 AI 사용

## 결과 해석

### 테스트 실행 중

k6가 터미널에 실시간 메트릭을 표시합니다:

```
     ✓ SSE stream connected
     ✓ SSE received chunks
     ✓ SSE stream completed

     checks.........................: 99.8%  ✓ 14982    ✗ 18
     data_received..................: 45 MB  75 kB/s
     data_sent......................: 12 MB  20 kB/s
     http_req_duration..............: avg=1.2s   p(95)=2.1s
     sse_first_chunk_latency........: avg=800ms  p(95)=1.5s
     vus............................: 20     min=0      max=20
```

### 테스트 완료 후

결과는 `results/` 디렉토리에 JSON으로 저장됩니다:

```bash
# 결과 파일 목록
ls results/

# 예시 출력:
# chat-streaming.json
# connectrpc.json
# mixed-workload.json
```

### 주요 메트릭 설명

**SSE 스트리밍**:
- `sse_connection_time`: SSE 연결 설정 시간
- `sse_first_chunk_latency`: 첫 AI 응답 청크까지의 시간
- `sse_total_duration`: 완전한 스트리밍 소요 시간
- `sse_chunks_received`: 수신한 SSE 이벤트 수
- `sse_error_rate`: 실패한 SSE 연결 비율

**Gem 경제**:
- `gem_deduction_latency`: Gem 트랜잭션 시간
- `gem_balance_errors`: 음수 잔액 (0이어야 함)
- `insufficient_gem_rate`: 402 에러 비율 (예상됨)

**일반**:
- `http_req_duration`: 요청 지연시간 (p50, p95, p99)
- `http_req_failed`: 에러율
- `http_reqs`: 처리량 (requests/second)
- `vus`: 활성 가상 사용자
- `iterations`: 완료된 사용자 여정

### 임계값 실패

임계값이 실패하면:

```
✗ sse_first_chunk_latency: p(95) < 2000ms
  → actual: p(95)=2450ms
```

**조사 단계**:
1. API 서버 로그에서 에러 확인
2. 데이터베이스 쿼리 성능 모니터링 (Supabase 대시보드)
3. AI 서버 응답 시간 확인
4. 시스템 리소스 확인 (CPU, 메모리, 커넥션)

## 정리

테스트 후 테스트 데이터를 리셋:

```bash
pnpm cleanup
```

다음을 수행합니다:
- 테스트 메시지 삭제
- 채팅방 삭제
- Gem 지갑을 초기 상태로 리셋
- 테스트 결과 아카이브
- 재사용을 위해 테스트 사용자/캐릭터 보존

테스트 사용자를 완전히 제거하려면 Supabase Auth 대시보드에서 수동으로 삭제하세요.

## 문제 해결

### "테스트 사용자를 찾을 수 없습니다"

```bash
# setup을 다시 실행
pnpm seed
```

### "API가 정상이 아닙니다"

```bash
# API 서버가 실행 중인지 확인
cd apps/api
pnpm dev

# 헬스 체크
curl http://localhost:3000/health
```

### "Gem이 부족합니다" 에러

예상된 동작입니다. 리셋하려면:

```bash
pnpm cleanup
pnpm seed
```

### 401 인증 에러 (Rate Limiting)

Supabase rate limiting이 발생한 경우:

1. **10-15분 대기** - rate limit 리셋 대기 (5분으로는 부족할 수 있음)
2. **토큰 캐싱 적용됨** (v2.0+):
   - 각 VU는 처음 한 번만 인증
   - 이후 iteration에서 토큰 재사용
   - 인증 요청 90% 감소
3. **테스트 설정 최적화**:
   - VUs 감소 (10-15)
   - Think time 증가 (connectrpc: 4-10초)
   - 메시지 수 감소 (3개)
4. **여전히 에러 발생 시**:
   - 다른 날에 테스트 실행 (일일 rate limit)
   - Supabase 대시보드에서 rate limit 상태 확인

### 포트 충돌

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### k6를 찾을 수 없음

k6 재설치:

```bash
# Windows
choco install k6

# macOS
brew install k6
```

## 실제 부하 테스트를 위한 스테이징 환경

로컬 환경은 **기능 검증**용입니다. **실제 부하 테스트**는 스테이징 환경이 필요합니다.

### 스테이징 환경 요구사항

- **자체 PostgreSQL**: Supabase rate limit 없음
- **충분한 리소스**: 50-100 VUs 처리 가능
- **격리된 환경**: 프로덕션에 영향 없음

### Docker Compose 예제

```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: personachat_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test123
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=256MB"

  api:
    build: ../../apps/api
    environment:
      DATABASE_URL: postgresql://test:test123@postgres:5432/personachat_test
      NODE_ENV: staging
    depends_on:
      - postgres

  ai-server:
    build: ../../apps/ai-server
    environment:
      API_URL: http://api:3000
```

### 스테이징 환경 테스트 실행

```bash
# 스테이징 환경 시작
docker-compose -f docker-compose.staging.yml up -d

# 실제 부하 테스트 (50-100 VUs)
k6 run -e API_URL=http://localhost:3000 \
  --vus 50 \
  --duration 15m \
  scripts/load/chat-streaming.js
```

**스테이징 환경 임계값** (엄격):
- RPC 지연: p95 < 200ms
- SSE 첫 청크: p95 < 1초
- 에러율: < 0.5%

## Rate Limiting 회피 전략

Supabase와 API 서버의 rate limiting을 피하기 위해 다음 최적화를 적용했습니다:

### 1. 토큰 캐싱 (가장 중요!)

**문제**: 매 iteration마다 새로 인증하면 Supabase Auth API를 과도하게 호출
**해결**: 각 VU는 처음 한 번만 인증하고 이후 토큰 재사용

```javascript
// 각 VU별로 토큰 캐싱
const tokenCache = {};

export default function (data) {
  if (!tokenCache[__VU]) {
    tokenCache[__VU] = authenticate(user.email, user.password);
    sleep(1);  // 인증 후 1초 대기
  }
  const token = tokenCache[__VU];  // 재사용
}
```

**효과**: 인증 요청 90% 이상 감소

### 2. VUs 감소
- **chat-streaming**: 50 → **15 VUs**
- **connectrpc**: 100 → **10 VUs**
- **mixed-workload**: 75 → **15 VUs**

### 3. Think Time 증가
- **일반 테스트**: 15-45초 (config.js)
- **connectrpc**: 4-10초 (RPC 호출 간)
- **세션당 메시지**: 5 → **3개**

### 4. 권장사항
- 연속 테스트 간 **10-15분 대기** (5분으로는 부족)
- 스모크 테스트를 먼저 실행하여 시스템 확인
- 여전히 401 에러 발생 시 다른 날에 테스트
- Supabase 대시보드에서 rate limit 상태 모니터링

## CI/CD 통합

`.github/workflows/load-test.yml` 참조

**트리거**:
- 테스트 유형 선택이 가능한 수동 디스패치
- Pull request (스모크 테스트만)

**테스트 환경**:
- 스모크 테스트: 모든 PR에서 실행
- 부하 테스트: 주간 일정 또는 수동
- 스트레스 테스트: 수동만

## 파일 구조

```
load-tests/
├── package.json          # 스크립트 및 의존성
├── .env.example          # 환경 변수 템플릿
├── README.md            # 이 파일
├── QUICK_START.md       # 5분 시작 가이드
├── scripts/
│   ├── utils/           # 공유 유틸리티
│   │   ├── config.js    # 환경 설정
│   │   ├── auth.js      # 인증 헬퍼
│   │   ├── gems.js      # Gem 잔액 헬퍼
│   │   └── setup.js     # 테스트 설정 유틸리티
│   ├── smoke/           # 빠른 검증 테스트
│   │   ├── health-check.js
│   │   └── auth-flow.js
│   ├── load/            # 예상 트래픽 테스트
│   │   ├── chat-streaming.js
│   │   ├── connectrpc.js
│   │   └── mixed-workload.js
│   ├── stress/          # 한계 찾기 테스트
│   ├── spike/           # 급증 테스트
│   └── soak/            # 장시간 테스트
├── setup/
│   ├── seed-test-db.ts  # 데이터베이스 시딩
│   └── cleanup.ts       # 정리 스크립트
├── fixtures/            # 테스트 데이터 (gitignored)
│   ├── test-users.json
│   └── characters.json
└── results/             # 테스트 출력 (gitignored)
```

## 모범 사례

1. **항상 스모크 테스트를 먼저 실행** - 대규모 테스트 전
2. **Mock AI 모드 사용** - 개발 및 빈번한 테스트용
3. **시스템 리소스 모니터링** - 스트레스 테스트 중
4. **정기적으로 정리** - 데이터베이스 비대화 방지
5. **결과 아카이브** - 추세 분석용
6. **현실적인 임계값 설정** - 실제 사용자 경험 기반
7. **점진적 테스트** - 작게 시작하여 확장
8. **실패 문서화** - 성능 개선 추적

## 고급 사용법

### 커스텀 테스트 파라미터

```bash
# VU 수 재정의
k6 run --vus 100 scripts/load/chat-streaming.js

# 지속 시간 재정의
k6 run --duration 30m scripts/load/chat-streaming.js

# 환경 변수 설정
k6 run -e API_URL=https://staging.example.com scripts/smoke/health-check.js
```

### 분산 테스팅

매우 큰 테스트의 경우 k6 Cloud 사용 또는 분산 실행:

```bash
# k6 Cloud에서 실행
k6 cloud scripts/load/chat-streaming.js

# 또는 Kubernetes에서 k6 operator 사용
```

### 커스텀 메트릭

스크립트에 메트릭 추가:

```javascript
import { Trend, Counter } from 'k6/metrics';

const myMetric = new Trend('my_custom_metric');
myMetric.add(value);
```

## 지원

문제나 질문이 있으면:
1. 위의 문제 해결 섹션 확인
2. k6 문서 검토: https://k6.io/docs/
3. 리포지토리에 이슈 열기

## 라이선스

상위 프로젝트와 동일.
