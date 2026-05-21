# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Persona Chat은 AI 캐릭터 롤플레이 서비스로, ConnectRPC 기반의 타입 안전한 풀스택 모노레포 아키텍처를 사용합니다.

**핵심 기술:**
- **모노레포**: Turborepo + pnpm 워크스페이스
- **RPC**: ConnectRPC + Protocol Buffers (타입 안전 통신)
- **프론트엔드**: Next.js 15 (App Router), React 19, Tailwind CSS
- **백엔드 API**: Fastify 4.28 + Prisma ORM
- **AI 서버**: FastAPI (Python) + OpenRouter + SSE 스트리밍
- **데이터베이스**: PostgreSQL (Supabase)
- **인증**: Supabase Auth (JWT)

## 아키텍처

```
mini-whif/
├── apps/
│   ├── web/              # Next.js 프론트엔드 (포트 3001)
│   ├── api/              # Fastify 백엔드 (포트 3000)
│   └── ai-server/        # FastAPI AI 스트리밍 (포트 8000)
├── packages/
│   ├── proto/            # Protocol Buffers 정의 + 생성된 코드
│   └── shared-types/     # 공유 TypeScript 타입
└── load-tests/           # k6 부하 테스트
```

### 앱별 책임

**apps/web (Next.js 15)**
- App Router 기반 라우팅
- ConnectRPC 클라이언트로 API 통신
- SSE로 AI 응답 스트리밍 수신
- Zustand 상태 관리, React Query 서버 상태
- 다크 사이버펑크 디자인 시스템

**apps/api (Fastify) - Clean Architecture 적용**
- REST 엔드포인트: `/auth/*`, `/health`, `/docs`
- ConnectRPC 서비스: CharacterService, PersonaService, ChatRoomService, LlmModelService, UniverseService
- **Repository 레이어**: 데이터 접근 추상화 (7개 Repository)
  - domain/repositories: 인터페이스 (IChatRoomRepository, IMessageRepository 등)
  - infrastructure/repositories: Prisma 구현
- Supabase Auth JWT 검증 미들웨어
- AI 서버로 SSE 스트리밍 중계

**아키텍처 레이어:**
```
HTTP Layer (routes, handlers)
     ↓
Application Layer (services - Phase 3 예정)
     ↓
Domain Layer (repository interfaces)
     ↑
Infrastructure Layer (Prisma implementations)
```

**apps/ai-server (FastAPI)**
- OpenRouter로 LLM 접근 (Claude, Gemini 등)
- SSE로 AI 응답 스트리밍
- Langfuse를 통한 LLM 모니터링 (선택사항)
- 캐릭터 + 페르소나 기반 시스템 프롬프트 구성

## 개발 환경 설정

### 필수 요구사항
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Python >= 3.12 (AI 서버용)

### 초기 설정

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 편집하여 Supabase 자격 증명 입력

# 3. Proto 코드 생성
pnpm proto:gen

# 4. 데이터베이스 설정
pnpm db:migrate
pnpm db:seed

# 5. AI 서버 설정
cd apps/ai-server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 개발 서버 시작

**옵션 1: 모든 서비스 병렬 실행**
```bash
pnpm dev  # Turborepo가 모든 앱을 병렬로 시작
```

**옵션 2: 개별 실행**
```bash
# 터미널 1: API (http://localhost:3000)
cd apps/api
pnpm dev

# 터미널 2: AI 서버 (http://localhost:8000)
cd apps/ai-server
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000

# 터미널 3: 프론트엔드 (http://localhost:3001)
cd apps/web
pnpm dev
```

## 주요 개발 명령어

### 루트 레벨
```bash
pnpm dev          # 모든 서비스 병렬 실행 (Turborepo)
pnpm build        # 모든 패키지 빌드
pnpm lint         # 모든 패키지 린트
pnpm test         # 모든 테스트 실행
pnpm clean        # 빌드 아티팩트 정리
```

### 데이터베이스 (Prisma)
```bash
pnpm db:migrate   # 마이그레이션 실행
pnpm db:seed      # 초기 데이터 시딩
pnpm db:studio    # Prisma Studio 열기 (http://localhost:5555)

# apps/api 디렉토리에서 직접 실행 가능
cd apps/api
pnpm db:generate  # Prisma 클라이언트 재생성 (schema 변경 후)
```

### Protocol Buffers
```bash
pnpm proto:gen    # .proto 파일에서 TypeScript 코드 생성
```

### 테스트
```bash
# 단위 테스트 (API 서버)
cd apps/api
pnpm test         # Vitest 실행
pnpm test --coverage  # 커버리지 확인

# E2E 테스트 (프론트엔드)
cd apps/web
pnpm test:e2e     # Playwright 실행
```

### 부하 테스트 (k6)
```bash
cd load-tests
pnpm setup        # 테스트 데이터 생성 (100명 사용자 + 캐릭터)
pnpm smoke        # 스모크 테스트 (1-2분)
pnpm load:chat    # SSE 스트리밍 부하 테스트
pnpm stress       # 스트레스 테스트 (500 VUs)
pnpm cleanup      # 테스트 데이터 정리
```

## 타입 안전 아키텍처

### ConnectRPC 흐름

1. **proto 정의** (`packages/proto/protos/*.proto`)
   ```protobuf
   service CharacterService {
     rpc GetCharacter(GetCharacterRequest) returns (GetCharacterResponse);
   }
   ```

2. **코드 생성** (`pnpm proto:gen`)
   - TypeScript 타입 자동 생성
   - 클라이언트 및 서버 코드 생성
   - 단일 진실 공급원 (Single Source of Truth)

3. **서버 구현** (`apps/api/src/rpc/*.handler.ts`)
   ```typescript
   export const characterService: ServiceImpl<typeof CharacterService> = {
     async getCharacter(req, context) {
       // 타입 안전한 요청/응답
     }
   };
   ```

4. **클라이언트 사용** (`apps/web/src/lib/rpc-client.ts`)
   ```typescript
   const response = await rpcClient.getCharacter({ id: "..." });
   // 완전한 타입 안전성 + 자동완성
   ```

### 왜 ConnectRPC인가?

- **타입 드리프트 제거**: FE/BE가 동일한 타입 정의 공유
- **컴파일 타임 검증**: API 변경 시 즉시 오류 감지
- **HTTP/2 효율성**: 다중 동시 요청 지원
- **Better DX**: 자동완성, 타입 추론, 수동 fetch() 불필요

## 성능 최적화

### Phase 1 개선 사항 (2025년 1월)

다음과 같은 성능 병목을 제거했습니다:

**1. cloneChatRoom N+1 쿼리 제거**
- 위치: `apps/api/src/rpc/chatroom.handler.ts:561-571`
- 개선: `createMany`로 일괄 삽입 (메시지 100개 기준 10초 → 0.5초, 20배 향상)

**2. regenerate 순차 쿼리 병렬화**
- 위치: `apps/api/src/routes/message.routes.ts:340-373`
- 개선: `Promise.all`로 병렬 실행 + gemWallet 추가 쿼리 제거 (300ms → 100ms, 3배 향상)

**3. Reaction 업데이트 트랜잭션 추가**
- 위치: `apps/api/src/routes/message.routes.ts:186-281`
- 개선: `prisma.$transaction`으로 원자성 보장 (race condition 방지)

**4. 리스트 엔드포인트 최적화**
- 위치: `apps/api/src/rpc/character.handler.ts:47-74`, `universe.handler.ts:35-77`
- 개선: `select`로 필요한 필드만 조회 (data, lorebook 제외) (2초 → 0.3초, 6배 향상)

### 성능 최적화 가이드라인

**N+1 쿼리 방지:**
```typescript
// ❌ Bad: N+1 쿼리
for (const item of items) {
  await prisma.item.create({ data: item });
}

// ✅ Good: 일괄 삽입
await prisma.item.createMany({ data: items });
```

**쿼리 병렬화:**
```typescript
// ❌ Bad: 순차 실행
const user = await prisma.user.findUnique({ where: { id } });
const settings = await prisma.settings.findUnique({ where: { userId: id } });

// ✅ Good: 병렬 실행
const [user, settings] = await Promise.all([
  prisma.user.findUnique({ where: { id } }),
  prisma.settings.findUnique({ where: { userId: id } }),
]);
```

**트랜잭션 사용:**
```typescript
// ❌ Bad: race condition 가능
await prisma.reaction.create({ data });
await prisma.message.update({ where: { id }, data: { count: { increment: 1 } } });

// ✅ Good: 원자성 보장
await prisma.$transaction([
  prisma.reaction.create({ data }),
  prisma.message.update({ where: { id }, data: { count: { increment: 1 } } }),
]);
```

**select로 필요한 필드만 조회:**
```typescript
// ❌ Bad: 모든 필드 로딩 (무거운 JSON 포함)
const characters = await prisma.character.findMany({ where });

// ✅ Good: 필요한 필드만 조회
const characters = await prisma.character.findMany({
  where,
  select: {
    id: true,
    name: true,
    imageUrl: true,
    // data, lorebook 제외
  },
});
```

## 데이터베이스 스키마

### 핵심 모델 (`apps/api/prisma/schema.prisma`)

**사용자 & 인증**
- `Profile`: 사용자 계정 (Supabase Auth와 연동)
- `UserPersona`: 사용자 롤플레이 페르소나

**AI 시스템**
- `LlmModel`: 사용 가능한 AI 모델 (프리즘, 아이리스, 벨벳)
- `Character`: AI 캐릭터 (성격, 배경 스토리)
- `Universe`: 캐릭터 세계관 그룹

**채팅**
- `ChatRoom`: 대화 세션
- `Message`: 메시지 (버저닝 지원)
- `MessageVersion`: 대체 AI 응답
- `UserReaction`: 메시지 피드백 (좋아요/싫어요)

**Gem 경제**
- `GemWallet`: 사용자 잔액 (유료, 일일 무료, 프로모)
- `GemLog`: 거래 내역 (투명성)
- `GemOrder`: 결제 기록 (PortOne)

**기타**
- `Keyword`: 인기 검색어

### 성능 최적화
- GIN 인덱스 (`character.keywords`): 배열 검색 최적화
- 복합 인덱스 (`(userId, createdAt DESC)`): 페이지네이션 최적화
- 모든 외래 키에 인덱스

## 채팅 흐름 (SSE 스트리밍)

### 전체 흐름

1. **사용자 메시지 전송**
   - Frontend → `POST /chat-rooms/:roomId/messages` (REST)

2. **API 서버 처리** (`apps/api/src/routes/chat.routes.ts`)
   - 방 소유권 검증
   - Gem 잔액 확인
   - 사용자 메시지 DB 저장
   - AI 메시지 플레이스홀더 생성

3. **AI 서버 호출** (`apps/ai-server/app/main.py`)
   - API → AI Server: `POST /v1/chats?stream=true`
   - 캐릭터 + 페르소나 데이터 로드
   - 시스템 프롬프트 구성
   - OpenRouter 스트리밍 시작

4. **SSE 스트리밍**
   - AI Server → API: SSE 이벤트
   - API → Frontend: SSE 중계
   - Frontend: 점진적 텍스트 렌더링

5. **완료 처리**
   - AI 메시지 DB 업데이트
   - Gem 차감 (우선순위: 일일 → 프로모 → 유료)
   - 거래 로그 기록

### Gem 차감 로직

**우선순위:**
1. Free Daily (200/일) - 매일 충전
2. Free Promo - 프로모션 지급
3. Paid - 구매한 젬

**비용:**
- 프리즘 (Haiku): 5 gems/메시지
- 아이리스 (Sonnet 4.5): 10 gems/메시지
- 벨벳 (Gemini Flash): 8 gems/메시지

## 인증 흐름

### Supabase Auth 통합

1. **회원가입** (`POST /auth/signup`)
   - Supabase Auth 사용자 생성
   - Prisma Profile + GemWallet 초기화 (200 무료 젬)
   - JWT 반환

2. **로그인** (`POST /auth/login`)
   - Supabase 자격 증명 검증
   - JWT 반환

3. **보호된 라우트**
   - Frontend: `middleware.ts`에서 JWT 검증
   - Backend: `authenticateUser` 미들웨어
   - `request.user`에 사용자 정보 첨부

4. **OAuth** (Google)
   - Supabase 대시보드에서 설정
   - 콜백: `apps/web/src/app/auth/callback/route.ts`

## 파일 수정 시 주의사항

### Proto 파일 수정 시
```bash
# 1. packages/proto/protos/*.proto 수정
# 2. 코드 재생성
pnpm proto:gen
# 3. 영향받는 핸들러/클라이언트 업데이트
# 4. 타입 체크
pnpm build
```

### Prisma 스키마 수정 시
```bash
# 1. apps/api/prisma/schema.prisma 수정
cd apps/api
# 2. 마이그레이션 생성
pnpm db:migrate
# 3. Prisma 클라이언트 재생성
pnpm db:generate
# 4. 영향받는 서비스 코드 업데이트
```

### 환경 변수 추가 시
```bash
# 1. .env.example 업데이트
# 2. .env에 실제 값 추가
# 3. 타입 정의 업데이트 (필요시)
# 4. README.md 문서화
```

### Repository 추가 시 (Phase 2+)
```bash
# 1. 인터페이스 생성
# apps/api/src/domain/repositories/IMyRepository.ts

# 2. 구현 생성
# apps/api/src/infrastructure/repositories/PrismaMyRepository.ts

# 3. 테스트 작성
# apps/api/src/infrastructure/repositories/__tests__/PrismaMyRepository.test.ts

# 4. 사용
# const myRepo = new PrismaMyRepository(prisma);
```

**Repository 설계 가이드라인:**
- 인터페이스는 Prisma에 의존하지 않음 (순수 TypeScript)
- 권한 검증은 Repository 레이어에서 처리 (userId 파라미터)
- Phase 1 최적화 적용 (createMany, Promise.all, select)
- 트랜잭션이 필요한 복잡한 작업도 Repository에 캡슐화
- 자세한 내용은 `docs/ARCHITECTURE.md` 참조

## 디자인 시스템

### 색상 팔레트 (`apps/web/tailwind.config.ts`)
- Primary: 보라색 (`#842BD2`)
- Background: 진한 회색 (`#0F0F0F`, `#1A1A1A`)
- Accent: 네온 보라/핑크 그라데이션

### 주요 컴포넌트 클래스 (`apps/web/src/app/globals.css`)
- `.glass-card`: 글래스모피즘 효과
- `.glow-button`: 네온 그림자 버튼
- `.ai-bubble` / `.user-bubble`: 채팅 메시지
- `.persona-pulse`: 애니메이션 그라데이션 테두리

### 폰트
- Display/Headlines: Sora
- Body/Labels: Inter
- Monospace: JetBrains Mono

## API 엔드포인트

### REST (`apps/api/src/routes/`)
- `POST /auth/signup`: 회원가입
- `POST /auth/login`: 로그인
- `GET /auth/me`: 현재 사용자 (보호됨)
- `GET /health`: 헬스체크
- `GET /docs`: Swagger UI
- `POST /chat-rooms/:roomId/messages`: 메시지 전송 (SSE)
- `GET /mypage/wallet`: Gem 잔액
- `POST /payments/portone/webhook`: PortOne 결제 웹훅

### ConnectRPC (`apps/api/src/rpc/`)
- `CharacterService`: 캐릭터 CRUD
- `PersonaService`: 사용자 페르소나 관리
- `ChatRoomService`: 채팅룸 관리
- `LlmModelService`: AI 모델 설정
- `UniverseService`: 세계관 관리

## 테스팅

### 단위 테스트
```bash
# API 서버
cd apps/api
pnpm test

# 프론트엔드
cd apps/web
pnpm test
```

### E2E 테스트 (Playwright)
```bash
cd apps/web
pnpm test:e2e          # 헤드리스 모드
pnpm test:e2e:ui       # UI 모드
pnpm test:e2e:debug    # 디버그 모드
```

### 부하 테스트 (k6)
자세한 내용은 `load-tests/README.md` 참조

## 배포

### Docker Compose
```bash
# 프로덕션 빌드 및 실행
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose logs -f api

# 중지
docker-compose down
```

### 환경 변수 체크리스트
- ✅ `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `DATABASE_URL`, `DIRECT_URL`
- ✅ `OPENROUTER_API_KEY` (AI 기능용)
- ✅ `PORTONE_API_KEY` (결제용)
- ✅ `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` (선택사항)
- ✅ `NODE_ENV=production`

## 트러블슈팅

### 타입 오류
```bash
# Proto 코드 재생성
pnpm proto:gen

# Prisma 클라이언트 재생성
cd apps/api && pnpm db:generate

# 전체 재빌드
pnpm clean && pnpm install && pnpm build
```

### 데이터베이스 연결 오류
- `DATABASE_URL` 검증 (Transaction Pooler URL 사용)
- Supabase 프로젝트 상태 확인
- `DIRECT_URL`로 시도

### SSE 스트리밍 실패
- AI 서버 실행 확인 (`http://localhost:8000/health`)
- `OPENROUTER_API_KEY` 설정 확인
- Gem 잔액 충분한지 확인

### 포트 충돌
- API: `.env`에서 `PORT` 변경 (기본 3000)
- Web: `apps/web/package.json`의 `-p 3001` 수정
- AI: uvicorn `--port` 옵션 변경 (기본 8000)

## 모니터링

### Langfuse (선택사항)
- LLM 호출 추적 (입력, 출력, 지연시간, 비용)
- 사용자 피드백 수집
- 대시보드: https://cloud.langfuse.com

### 로그
- Fastify: Pino 로거 (pretty-print in dev)
- FastAPI: Uvicorn 접근 로그
- 프로덕션: 구조화된 JSON 로깅

## 참고 문서

- 메인 README: `README.md`
- API 빠른 시작: `API_QUICKSTART.md`
- 부하 테스트: `load-tests/README.md`, `load-tests/QUICK_START.md`
- Prisma 스키마: `apps/api/prisma/schema.prisma`
- Proto 정의: `packages/proto/protos/`
