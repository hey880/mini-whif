# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Persona Chat은 AI 캐릭터 롤플레이 서비스로, Turborepo + pnpm을 사용한 모노레포 구조입니다. ConnectRPC를 통한 엔드투엔드 타입 안전성, SSE 스트리밍 AI 응답, 그리고 Gem 기반 가상 화폐 시스템을 특징으로 합니다.

## 핵심 명령어

### 개발 환경 시작

```bash
# 루트에서 모든 서비스 병렬 실행
pnpm dev

# 또는 개별 실행
cd apps/api && pnpm dev        # API 서버 (Port 3000)
cd apps/ai-server && fastapi dev  # AI 서버 (Port 8000)
cd apps/web && pnpm dev        # 프론트엔드 (Port 3001)
```

### 데이터베이스 관리

```bash
# 마이그레이션 생성 및 적용
pnpm db:migrate

# 데이터베이스 시딩
pnpm db:seed

# Prisma Studio 열기
pnpm db:studio

# 특정 앱에서 실행 (apps/api에서)
cd apps/api
pnpm db:generate  # Prisma Client 재생성
pnpm db:migrate   # 마이그레이션 실행
```

### Protocol Buffers 코드 생성

```bash
# .proto 파일 수정 후 반드시 실행
pnpm proto:gen

# 특정 패키지에서 실행
cd packages/proto
pnpm generate
pnpm lint      # proto 파일 lint
pnpm format    # proto 파일 포맷
```

### 빌드 및 테스트

```bash
# 모든 패키지 빌드
pnpm build

# 모든 패키지 lint
pnpm lint

# 모든 테스트 실행
pnpm test

# 빌드 아티팩트 정리
pnpm clean
```

### Docker 배포

```bash
# 모든 서비스 빌드 및 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f api

# 서비스 중지
docker-compose down
```

## 아키텍처 개요

### 모노레포 구조

```
mini-whif/
├── apps/
│   ├── web/        # Next.js 15 프론트엔드 (Port 3001)
│   ├── api/        # Fastify 백엔드 (Port 3000)
│   └── ai-server/  # FastAPI AI 서비스 (Port 8000)
└── packages/
    ├── proto/          # Protocol Buffers 정의 및 코드 생성
    └── shared-types/   # 공유 TypeScript 타입
```

### 통신 프로토콜 3가지

1. **ConnectRPC** (타입 안전 RPC):
   - Character, Persona, ChatRoom, LlmModel 서비스
   - `.proto` 파일로 정의, 자동 타입 생성
   - 프론트엔드-백엔드 간 타입 불일치 방지

2. **REST API** (Swagger 문서화):
   - 인증 (`/auth/*`)
   - 채팅 메시지 전송 (SSE 스트리밍)
   - 결제 처리 (`/payments/*`)
   - 문서: http://localhost:3000/docs

3. **Server-Sent Events (SSE)**:
   - AI 응답 실시간 스트리밍
   - `POST /chat-rooms/:roomId/messages`
   - API 서버가 AI 서버로부터 SSE를 중계

### 데이터 흐름

```
사용자 메시지 전송 →
프론트엔드 (ConnectRPC/REST) →
API 서버 (Fastify):
  - 인증 확인 (Supabase JWT)
  - Gem 잔액 확인
  - DB에 메시지 저장 →
AI 서버 (FastAPI):
  - OpenRouter로 스트리밍
  - SSE 이벤트 전송 →
API 서버가 프론트엔드로 중계 →
완료 시:
  - DB 업데이트
  - Gem 차감 (우선순위: 일일 → 프로모 → 유료)
  - 거래 로그 기록
```

### 인증 흐름

1. Supabase Auth로 사용자 생성/로그인
2. JWT 토큰 발급
3. API 요청 시 `Authorization: Bearer <token>` 헤더
4. Fastify 미들웨어가 토큰 검증 (`apps/api/src/plugins/auth.ts`)
5. `request.user`에 사용자 정보 첨부
6. ConnectRPC 핸들러는 `userContextKey`로 컨텍스트 접근

## 주요 개발 패턴

### Protocol Buffers 수정 시

1. `packages/proto/proto/*.proto` 파일 수정
2. `pnpm proto:gen` 실행하여 TypeScript 코드 재생성
3. API 서버와 웹 서버 재시작
4. 타입 오류 확인 및 수정

### 데이터베이스 스키마 변경 시

1. `apps/api/prisma/schema.prisma` 수정
2. `cd apps/api && pnpm db:migrate` 실행
3. 마이그레이션 이름 입력
4. Prisma Client 자동 재생성
5. API 서버 재시작

### 새 RPC 서비스 추가 시

1. `packages/proto/proto/` 에 `.proto` 파일 생성
2. 서비스 및 메시지 정의
3. `pnpm proto:gen` 실행
4. `apps/api/src/rpc/` 에 핸들러 생성
5. `apps/api/src/index.ts` 에 서비스 등록:
   ```typescript
   routes(ConnectRouter(YourService, yourHandlers));
   ```

### 새 REST 엔드포인트 추가 시

1. `apps/api/src/routes/` 에 라우트 파일 생성
2. Zod 스키마로 요청 검증
3. `apps/api/src/index.ts` 에 라우트 등록:
   ```typescript
   await server.register(yourRoutes, { prefix: '/your-prefix' });
   ```

## 데이터베이스 스키마 핵심 개념

### 주요 모델 구조

**사용자 & 인증**:
- `Profile`: Supabase auth 연동 사용자 프로필
- `GemWallet`: 사용자별 Gem 잔액 (paid, freeDaily, freePromo)
- `GemLog`: Gem 거래 내역
- `GemOrder`: 결제 주문 기록

**캐릭터 시스템**:
- `Universe`: 캐릭터 세계관 그룹
- `Character`: AI 캐릭터 (keywords는 GIN 인덱스)
  - `data` JSON 필드: 유연한 캐릭터 속성
  - `lorebook` JSON 필드: 세계관 정보
- `LlmModel`: 사용 가능한 AI 모델 및 Gem 비용

**채팅 시스템**:
- `ChatRoom`: 사용자-캐릭터 대화 세션
- `Message`: 개별 메시지 (버저닝 지원)
- `MessageVersion`: 대체 AI 응답 (재생성)
- `UserReaction`: 메시지 피드백 (좋아요/싫어요)

**페르소나**:
- `UserPersona`: 사용자 정의 롤플레이 페르소나

### 데이터베이스 네이밍 컨벤션

- DB 필드: `snake_case` (예: `user_id`, `created_at`)
- Prisma 모델: `camelCase` (예: `userId`, `createdAt`)
- Prisma `@map()` 디렉티브로 매핑

### 성능 최적화

- 배열 검색을 위한 GIN 인덱스 (`Character.keywords`)
- 페이지네이션을 위한 복합 인덱스 (`userId, createdAt DESC`)
- 모든 외래 키에 인덱스 자동 생성
- UUID 기본 키 (`gen_random_uuid()`)

## Gem 경제 시스템

### Gem 종류 및 우선순위

1. **Free Daily** (200/일): 매일 자정 충전, 먼저 사용
2. **Free Promo**: 프로모션 지급, 두 번째로 사용
3. **Paid**: 구매한 젬, 마지막으로 사용

### 비용 구조

- 프리즘 (Haiku): 5 gems/메시지
- 아이리스 (Sonnet 4.5): 10 gems/메시지
- 벨벳 (Gemini Flash): 8 gems/메시지

### 차감 로직

- AI 응답 완료 시 차감 (`apps/api/src/services/gem.service.ts`)
- 우선순위에 따라 자동 선택
- 거래 내역 `GemLog`에 기록

## 환경 변수

### 필수 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database (Prisma)
DATABASE_URL=postgresql://...?pgbouncer=true  # Transaction mode (Port 6543)
DIRECT_URL=postgresql://...                   # Session mode (Port 5432)

# API Server
NEXT_PUBLIC_API_URL=http://localhost:3000
AI_SERVER_URL=http://localhost:8000

# Frontend
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 선택 변수

```env
# OpenRouter (AI 응답)
OPENROUTER_API_KEY=sk-or-v1-...

# Langfuse (LLM 모니터링)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# PortOne (결제)
PORTONE_SHOP_ID=...
PORTONE_API_KEY=...
```

## 기술 스택 요약

| 레이어 | 기술 | 포트 |
|--------|------|------|
| 프론트엔드 | Next.js 15, React 19, Tailwind CSS | 3001 |
| 백엔드 API | Fastify 4, ConnectRPC, Node.js 20 | 3000 |
| AI 서비스 | FastAPI, Python 3.12, OpenRouter | 8000 |
| 데이터베이스 | PostgreSQL (Supabase) | 5432 |
| 패키지 관리 | pnpm 9.4 | - |
| 빌드 도구 | Turborepo 2.0 | - |
| RPC | ConnectRPC + Protocol Buffers | - |
| ORM | Prisma 5 | - |
| 상태 관리 | Zustand | - |
| 인증 | Supabase JWT | - |

## 코드 컨벤션

### 네이밍

- 서비스: `<domain>.service.ts`
- 라우트: `<domain>.routes.ts`
- RPC 핸들러: `<domain>.handler.ts`
- Zustand 스토어: `stores/<name>Store.ts`

### Import 순서 (ESLint 강제)

1. 외부 라이브러리
2. 내부 패키지 (`@/`, `~/`)
3. 상대 경로 imports
4. 타입 imports (별도 그룹)

### TypeScript

- Strict 모드 활성화
- 명시적 return 타입 선호
- Zod로 런타임 검증 (REST API)
- Proto로 타입 생성 (RPC)

## 중요 참고사항

### Supabase Realtime 설정

Supabase 대시보드에서 Realtime 기능을 활성화해야 합니다:
1. Database > Replication 메뉴
2. 필요한 테이블에 대해 realtime 활성화

### DATABASE_URL vs DIRECT_URL

- `DATABASE_URL`: Transaction pooler (Port 6543) - Prisma 쿼리용
- `DIRECT_URL`: Direct connection (Port 5432) - 마이그레이션용
- 둘 다 필요함. 마이그레이션 시 DIRECT_URL 사용

### AI 서버 없이 개발하기

- OpenRouter API 키 없이도 동작 가능
- AI 서버가 모의(mock) 응답 반환
- 실제 AI 기능 테스트 시 키 필요

## 문제 해결

### Proto 생성 실패

```bash
# buf CLI가 없는 경우
npm install -g @bufbuild/buf

# 또는 npx 사용
npx @bufbuild/buf generate
```

### Prisma 마이그레이션 실패

- `.env`에 `DIRECT_URL` (Port 5432) 확인
- Supabase 프로젝트 상태 확인 (일시중지 아님)
- 데이터베이스 비밀번호 정확성 확인

### 포트 충돌

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

## 관련 문서

- [README.md](./README.md): 전체 프로젝트 개요
- [GETTING_STARTED.md](./GETTING_STARTED.md): 상세 설정 가이드
- API 문서: http://localhost:3000/docs (Swagger)
- AI 서버 문서: http://localhost:8000/docs (FastAPI)
