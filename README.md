# Persona Chat - AI 캐릭터 롤플레이 서비스

> ConnectRPC, 스트리밍 AI 응답, 엔드투엔드 타입 안전성을 갖춘 모던 모노레포 아키텍처를 보여주는 풀스택 AI 챗봇 포트폴리오

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.28-green)](https://www.fastify.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5.15-2D3748)](https://www.prisma.io/)

## 🎯 프로젝트 개요

Persona Chat은 다음을 보여주는 정교한 AI 캐릭터 챗봇 플랫폼입니다:

- **모노레포 아키텍처**: 효율적인 멀티 패키지 관리를 위한 Turborepo + pnpm 워크스페이스
- **타입 안전 RPC**: 프론트엔드-백엔드 통신의 타입 불일치를 방지하는 ConnectRPC + Protocol Buffers
- **스트리밍 AI**: Server-Sent Events(SSE)를 통한 실시간 AI 응답
- **모던 스택**: Next.js 15, Fastify, FastAPI, Prisma, Supabase
- **프로덕션 패턴**: 인증, 결제 처리, 모니터링 및 분석

## 🏗️ 아키텍처

```
persona-chat/
├── apps/
│   ├── web/              # Next.js 15 프론트엔드 (App Router)
│   ├── api/              # Fastify + ConnectRPC 백엔드
│   └── ai-server/        # FastAPI AI 스트리밍 서비스
├── packages/
│   ├── shared-types/     # 공유 TypeScript 타입
│   └── proto/            # Protocol Buffers + 생성된 코드
└── [설정 파일들]
```

### 기술 스택

**프론트엔드** (apps/web):

- Next.js 15 with App Router
- TypeScript 5.5
- Tailwind CSS (다크 사이버펑크 디자인 시스템)
- ConnectRPC Client
- Zustand (상태 관리)
- React Query (서버 상태 관리)

**백엔드 API** (apps/api):

- Fastify 4.28 (Express보다 2-3배 빠름)
- ConnectRPC (타입 안전 RPC)
- Prisma ORM with PostgreSQL
- Supabase Auth (JWT 검증)
- Swagger/OpenAPI 문서

**AI 서비스** (apps/ai-server):

- FastAPI (async Python)
- OpenRouter (멀티 모델 AI 접근)
- Langfuse (LLM 모니터링 및 분석)
- Server-Sent Events (스트리밍)

**인프라**:

- Turborepo (모노레포 빌드 오케스트레이션)
- pnpm (효율적인 패키지 관리)
- PostgreSQL (Supabase)
- Docker Compose (로컬 개발)

## 🚀 빠른 시작

### 사전 요구사항

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Python >= 3.12 (AI 서버용)
- Supabase 계정

### 1. 클론 및 설치

```bash
git clone <repo-url>
cd mini-whif
pnpm install
```

### 2. 환경 설정

```bash
# 환경 변수 템플릿 복사
cp .env.example .env

# Supabase 자격 증명 입력
# 다음에서 확인: https://supabase.com/dashboard/project/_/settings/api
```

필수 환경 변수:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### 3. Proto 코드 생성

```bash
pnpm proto:gen
```

### 4. 데이터베이스 설정

```bash
cd apps/api
pnpm db:migrate      # Prisma 마이그레이션 실행
pnpm db:seed         # 초기 데이터 시딩
pnpm db:studio       # (선택) Prisma Studio 열기
```

### 5. 개발 서버 시작

```bash
# 터미널 1: API 서버 (Port 3000)
cd apps/api
pnpm dev

# 터미널 2: AI 서버 (Port 8000)
cd apps/ai-server
python -m uvicorn app.main:app --reload --port 8000

# 터미널 3: 프론트엔드 (Port 3001)
cd apps/web
pnpm dev
```

접속:

- 프론트엔드: http://localhost:3001
- API 문서: http://localhost:3000/docs
- API 헬스체크: http://localhost:3000/health

## 📐 주요 설계 결정

### 왜 ConnectRPC인가?

- **타입 안전성**: .proto 파일을 기준으로 FE, BE가 동일한 API 명세를 공유 (single source of truth)
- **드리프트 없음**: .proto 파일을 기반으로 자동 생성된 타입을 사용하므로 프론트/백 간 요청·응답 형식 차이를 줄일 수 있음
- **더 나은 DX**: 자동완성, 컴파일 단계 오류 검출, 타입 자동 생성 기능이 있어 수동 fetch() 불필요
- **HTTP/2**: 하나의 연결에서 여러 요청을 동시에 처리할 수 있어, 빈번한 API 호출 환경에서 REST보다 효율적

vs REST: SSE 스트리밍에 사용 (이벤트 스트림에 더 자연스러움)

### 왜 Fastify인가?

- **성능**: 벤치마크에서 Express보다 2-3배 빠름
- **모던**: 네이티브 async/await, TypeScript 우선
- **확장 가능**: 풍부한 플러그인 생태계
- **ConnectRPC 통합**: @connectrpc/connect-fastify를 통한 일급 지원

vs Express/NestJS: NestJS보다 단순하고, Express보다 빠름

### 왜 별도 AI 서버인가?

- **언어 생태계**: Python이 AI SDK 환경을 지배 (OpenRouter, Langfuse)
- **독립적 확장**: AI 서비스를 API와 별도로 확장 가능
- **스트리밍 격리**: SSE 장시간 연결이 API 스레드를 차단하지 않음

### 왜 Turborepo인가?

- **캐싱**: 지능적인 빌드 캐싱으로 CI/CD 시간 절약
- **병렬 실행**: 독립적인 작업을 동시에 실행
- **간단한 설정**: 우리 사용 사례에 NX(다른 모노레포 관리도구)보다 덜 복잡
- **pnpm 통합**: pnpm 워크스페이스와 완벽하게 작동

## 🗄️ 데이터베이스 스키마

최적화된 인덱스를 가진 14개 테이블 (`apps/api/prisma/schema.prisma` 참조):

**핵심 엔티티**:

- `profiles` - 사용자 계정 (Supabase Auth 통합)
- `llm_models` - 사용 가능한 AI 모델 (Claude, Gemini 등)
- `characters` - 성격 데이터를 가진 AI 캐릭터
- `universes` - 캐릭터 세계관 그룹

**채팅 시스템**:

- `chat_rooms` - 대화 세션
- `messages` - 버저닝을 가진 개별 메시지
- `message_versions` - 대체 AI 응답
- `user_reactions` - 좋아요/싫어요 피드백

**Gems (가상 화폐)**:

- `gem_wallets` - 사용자 젬 잔액 (유료, 일일 무료, 프로모)
- `gem_logs` - 거래 내역
- `gem_orders` - 결제 기록

**기타**:

- `user_personas` - 사용자 롤플레이 페르소나
- `keywords` - 인기 검색어
- `user_reactions` - 메시지 피드백

**성능 최적화**:

- 빠른 배열 검색을 위한 `character.keywords`의 GIN 인덱스
- 페이지네이션을 위한 `(userId, createdAt DESC)` 복합 인덱스
- 모든 관계에 대한 외래 키 인덱스

## 🎨 디자인 시스템

57개 컬러 토큰을 가진 다크 사이버펑크 미학:

**색상**:

- Primary: 보라색 (`#842BD2`)
- Background: 진한 회색 (`#0F0F0F`, `#1A1A1A`)
- Surface: 블러 효과를 가진 글래스 카드
- Accent: 네온 보라/핑크 그라데이션

**타이포그래피**:

- Display/Headlines: Sora
- Body/Labels: Inter
- Monospace: JetBrains Mono

**컴포넌트**:

- `.glass-card` - 글래스모피즘 효과
- `.glow-button` - 네온 그림자 버튼
- `.ai-bubble` / `.user-bubble` - 채팅 메시지
- `.persona-pulse` - 애니메이션 그라데이션 테두리

`apps/web/tailwind.config.ts` 및 `apps/web/src/app/globals.css` 참조

## 🔐 인증 흐름

1. **회원가입** (`POST /auth/signup`):
   - Supabase Auth 사용자 생성
   - Prisma에 Profile 생성
   - 200 무료 젬으로 GemWallet 초기화
   - JWT + profile 반환

2. **로그인** (`POST /auth/login`):
   - Supabase로 자격 증명 검증
   - JWT + profile 반환

3. **보호된 라우트**:
   - 프론트엔드 미들웨어가 JWT 유효성 검사
   - 백엔드 `authenticateUser` 미들웨어가 JWT 검증
   - `request.user`에 사용자 정보 첨부

4. **OAuth** (Google):
   - Supabase 대시보드에서 구성
   - 프론트엔드: `supabase.auth.signInWithOAuth()`
   - 콜백: `/auth/callback`의 Next.js Route Handler

## 💬 채팅 흐름 (SSE 스트리밍)

1. 사용자가 프론트엔드를 통해 메시지 전송
2. 프론트엔드 → Fastify (`POST /chat-rooms/:roomId/messages`)
3. Fastify:
   - 방 소유권 확인
   - 젬 잔액 확인
   - 사용자 메시지를 DB에 저장
   - AI 메시지 플레이스홀더 생성
4. Fastify → FastAPI (`POST /v1/chats?stream=true`)
5. FastAPI:
   - 캐릭터 + 페르소나 + 메시지 기록 가져오기
   - 시스템 프롬프트 구성
   - OpenRouter에서 스트리밍
   - SSE 이벤트 전송
6. Fastify가 SSE를 프론트엔드로 중계
7. 프론트엔드가 점진적 텍스트 표시
8. 완료 시:
   - DB에서 AI 메시지 업데이트
   - 젬 차감 (우선순위: 일일 → 프로모 → 유료)
   - 거래 로그 기록

## 💎 Gem 경제

**Gem 종류**:

1. **Free Daily** (200/일) - 매일 충전, 먼저 사용
2. **Free Promo** - 프로모션 지급, 두 번째로 사용
3. **Paid** - 구매한 젬, 마지막으로 사용

**비용**:

- 프리즘 (Haiku): 5 gems/메시지
- 아이리스 (Sonnet 4.5): 10 gems/메시지
- 벨벳 (Gemini Flash): 8 gems/메시지

**결제** (PortOne):

- Starter: 500 gems → ₩1,100
- Pro: 1,200 gems → ₩2,200
- Whale: 3,000 gems → ₩5,500

## 🧪 테스팅

```bash
# 모든 테스트 실행
pnpm test

# 모든 패키지 린트
pnpm lint

# 모든 패키지 빌드
pnpm build
```

### 부하 테스팅 (k6)

SSE 스트리밍, Gem 경제, ConnectRPC를 위한 종합 부하 테스트 스위트:

```bash
cd load-tests

# 초기 설정 (한 번만 실행)
pnpm install
pnpm setup  # 100명의 테스트 사용자 + 캐릭터 생성

# 스모크 테스트 (1-2분)
pnpm smoke
pnpm smoke:auth

# 부하 테스트 (10-20분)
pnpm load:chat   # SSE 스트리밍 (50 VUs)
pnpm load:rpc    # ConnectRPC (100 VUs)
pnpm load:mixed  # 혼합 워크로드 (75 VUs)

# 스트레스 테스트
pnpm stress      # 500 VUs까지 확장
pnpm stress:gems # Gem 차감 동시성 테스트

# 정리
pnpm cleanup
```

**비용 절약**: `OPENROUTER_API_KEY` 없이 무료 Mock AI 모드 사용 가능

자세한 내용은 [load-tests/README.md](./load-tests/README.md) 및 [load-tests/QUICK_START.md](./load-tests/QUICK_START.md) 참조

## 🐳 Docker 배포

```bash
# 모든 서비스 빌드 및 시작
docker-compose up -d

# 로그 보기
docker-compose logs -f api

# 모든 서비스 중지
docker-compose down
```

## 📊 모니터링 및 분석

**Langfuse 통합** (선택사항):

- `@observe()` 데코레이터를 통한 자동 LLM 추적
- 캡처: 입력, 출력, 지연시간, 비용
- 사용자 피드백 기록 (좋아요/싫어요)
- 대시보드: https://cloud.langfuse.com

**로그**:

- Fastify: 개발 환경에서 pretty-print를 사용한 Pino 로거
- FastAPI: Uvicorn 접근 로그
- 프로덕션 환경에서 구조화된 로깅

## 🔧 개발 명령어

```bash
# 루트 명령어
pnpm dev          # 모든 서비스를 병렬로 시작
pnpm build        # 모든 패키지 빌드
pnpm lint         # 모든 패키지 린트
pnpm test         # 모든 테스트 실행
pnpm clean        # 모든 빌드 아티팩트 정리

# 데이터베이스
pnpm db:migrate   # Prisma 마이그레이션 실행
pnpm db:seed      # 데이터베이스 시딩
pnpm db:studio    # Prisma Studio 열기

# Proto
pnpm proto:gen    # .proto 파일에서 TypeScript 생성
```

## 📝 API 문서

**REST 엔드포인트**:

- `POST /auth/signup` - 계정 생성
- `POST /auth/login` - 로그인
- `GET /auth/me` - 현재 사용자 가져오기 (보호됨)
- `GET /health` - 헬스 체크
- `GET /docs` - Swagger UI

**ConnectRPC 서비스**:

- `CharacterService` - 캐릭터 CRUD
- `PersonaService` - 사용자 페르소나 관리
- `ChatRoomService` - 채팅 세션
- `LlmModelService` - AI 모델 설정

전체 API 참조는 `/docs` 엔드포인트 참조.

## 🗺️ 로드맵

**Phase 1** ✅ - 기반

- [x] 모노레포 설정
- [x] 데이터베이스 스키마
- [x] 인증 시스템
- [x] 기본 API 구조

**Phase 2** ✅ - 핵심 기능

- [x] ConnectRPC 핸들러 (Character, Persona, ChatRoom, LlmModel)
- [x] AI 스트리밍 서비스 (FastAPI with OpenRouter)
- [x] 프론트엔드 페이지 (5개 주요 페이지)
- [x] 스트리밍을 포함한 SSE 채팅 인터페이스

**Phase 3** ✅ - 마무리

- [x] 결제 통합 (PortOne)
- [x] Gem 경제 시스템
- [x] 사용자 프로필 & 페르소나
- [x] 전체 채팅 기능

**Phase 4** ✅ - 프로덕션

- [x] GitHub Actions CI/CD
- [x] Docker Compose 배포
- [x] 종합 문서
- [x] 엔드투엔드 타입 안전성

## 📄 라이선스

MIT License - 자세한 내용은 LICENSE 파일 참조

## 🙏 도움 받은 서비스

- [Supabase](https://supabase.com) - 백엔드 인프라
- [OpenRouter](https://openrouter.ai) - 멀티 모델 AI 접근
- [Langfuse](https://langfuse.com) - LLM 모니터링 및 분석
- [ConnectRPC](https://connectrpc.com) - Type Safty RPC 프레임워크
- [Turborepo](https://turbo.build) - 모노레포 빌드 시스템

---

**모던 풀스택 아키텍처를 보여주는 포트폴리오 프로젝트로 ❤️를 담아 제작했습니다**
