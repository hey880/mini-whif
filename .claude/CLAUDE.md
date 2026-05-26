# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요
AI 캐릭터와 사용자의 페르소나 캐릭터가 대화하는 채팅 서비스
- **모노레포 구조**: Turborepo + pnpm 워크스페이스 (apps/api, apps/web, apps/ai-server, packages/proto, packages/shared-types)
- **타입 안전 RPC**: ConnectRPC + Protocol Buffers로 FE-BE 간 타입 동기화
- **스트리밍 AI**: FastAPI AI 서버에서 SSE로 실시간 응답
- **Clean Architecture**: Repository 패턴, Service 레이어, 의존성 역전 원칙

## 작업 규칙
- 모든 md 문서 및 claude의 응답은 한글을 사용
- 이슈를 해결할 때는 반드시 **원인**과 해결법을 제시
- plan, README를 제외한 Claude가 참고해야 하는 md 문서 작성은 200줄 이내로 분할
- Commit은 git-flow-commit-kr agent를 사용
- 작업 중 실수를 한다면 다시 실수 하지 않도록 해당 사항을 md 파일에 추가

### AI 코드 어시스턴트 사용 시
1. **파일 하나만 보지 말고 전체 패턴 검색**
2. **수정 전에 데이터 구조 확인**
3. **같은 문제가 있을 법한 파일들을 proactive하게 검색**
4. **사용자가 제공한 재현 경로를 정확히 따르기**
5. **"이것도 문제일 수 있다"는 사고로 주변 코드 검토**

### 빌드/배포 비용 절감
- 수정 전 10분 투자 → 2번의 재배포 방지 (20-30분 절약)
- 패턴 검색 자동화 → 놓치는 케이스 제로화
- 테스트 시나리오 문서화 → 재발 방지

## 개발 명령어

### 공통 (루트)
```bash
pnpm install              # 모든 패키지 의존성 설치
pnpm dev                  # 모든 서비스 병렬 실행
pnpm build                # 모든 패키지 빌드
pnpm lint                 # 모든 패키지 린트
pnpm test                 # 모든 테스트 실행
pnpm proto:gen            # .proto 파일에서 TypeScript 생성
```

### API 서버 (apps/api)
```bash
cd apps/api
pnpm dev                  # 핫 리로드 개발 서버 (포트 3000)
pnpm build                # 프로덕션 빌드
pnpm start                # 프로덕션 실행
pnpm test                 # Vitest 테스트 실행
pnpm db:migrate           # Prisma 마이그레이션
pnpm db:seed              # 데이터베이스 시딩
pnpm db:studio            # Prisma Studio 열기
pnpm db:generate          # Prisma Client 재생성
```

### AI 서버 (apps/ai-server)
```bash
cd apps/ai-server
fastapi dev                            # 개발 서버 (포트 8000)
fastapi run                            # 프로덕션 서버
uvicorn app.main:app --reload          # 또는 uvicorn 직접 실행
```

### 프론트엔드 (apps/web)
```bash
cd apps/web
pnpm dev                  # 개발 서버 (포트 3001)
pnpm build                # Next.js 프로덕션 빌드
pnpm start                # 프로덕션 실행
pnpm lint                 # ESLint 검사
pnpm test:e2e             # Playwright E2E 테스트
```

## 아키텍처 핵심 원칙

### Clean Architecture 레이어 (apps/api/src)
```
HTTP Layer (routes, rpc)          # 가장 외부 - Fastify 라우트, ConnectRPC 핸들러
   ↓ depends on
Application Layer (services)       # 비즈니스 로직 - ChatService, MessageService 등
   ↓ depends on
Domain Layer (repositories)        # 인터페이스 - IChatRoomRepository 등
   ↑ implemented by
Infrastructure Layer (repositories) # Prisma 구현 - PrismaChatRoomRepository 등
```

**핵심 규칙: 외부는 내부를 알 수 있지만, 내부는 외부를 모른다.**

### Repository 패턴 사용 예시
```typescript
// ❌ 나쁨: Prisma 직접 호출
const room = await prisma.chatRoom.findUnique({ where: { id } });
if (!room || room.userId !== userId) throw new Error('Forbidden');

// ✅ 좋음: Repository 사용 (권한 검증 캡슐화)
const chatRoomRepo = new PrismaChatRoomRepository(prisma);
const room = await chatRoomRepo.findById(id, userId);
```

### 성능 최적화 패턴 (필수)
```typescript
// 1. createMany로 N+1 쿼리 제거
await prisma.message.createMany({ data: messages });

// 2. Promise.all로 병렬 실행
const [user, settings] = await Promise.all([
  prisma.user.findUnique({ where: { id } }),
  prisma.settings.findUnique({ where: { userId: id } })
]);

// 3. select로 무거운 필드 제외
await prisma.character.findMany({
  select: { id: true, name: true } // data, lorebook 제외
});

// 4. 트랜잭션으로 원자성 보장
await prisma.$transaction([
  prisma.reaction.create({ data }),
  prisma.message.update({ where: { id }, data: { count: { increment: 1 } } })
]);
```

## 데이터 흐름

### SSE 채팅 스트리밍 플로우
1. 프론트엔드 → Fastify API (`POST /chat-rooms/:roomId/messages`)
2. Fastify: 권한 확인, Gem 확인, 메시지 저장, AI 플레이스홀더 생성
3. Fastify → FastAPI AI 서버 (`POST /v1/chats?stream=true`)
4. FastAPI: 시스템 프롬프트 구성, OpenRouter 스트리밍, SSE 이벤트 전송
5. Fastify가 SSE를 프론트엔드로 중계
6. 완료 시: DB 업데이트, Gem 차감 (일일 → 프로모 → 유료 순서)

### ConnectRPC 서비스
- CharacterService: 캐릭터 CRUD
- PersonaService: 페르소나 관리
- ChatRoomService: 채팅방 관리
- LlmModelService: AI 모델 설정

## 주요 디렉토리 구조
```
apps/api/src/
├── domain/repositories/           # Repository 인터페이스 (추상)
├── application/services/          # 비즈니스 로직
├── infrastructure/repositories/   # Repository 구현 (Prisma)
├── routes/                        # REST 라우트
├── rpc/                          # ConnectRPC 핸들러
└── config/                       # Prisma, Supabase 설정

apps/ai-server/app/
├── routes/                       # FastAPI 라우트 (chat, feedback)
├── services/                     # LLM, Langfuse 서비스
└── models/                       # Pydantic 스키마

apps/web/src/
├── app/                         # Next.js App Router 페이지
├── components/                  # React 컴포넌트
└── lib/                        # ConnectRPC 클라이언트, Supabase

packages/
├── proto/                       # Protocol Buffers 정의
└── shared-types/                # 공유 TypeScript 타입
```

## RAG (검색 증강 생성) 시스템

### 개요
OpenAI 임베딩 기반 대화 기억 검색으로 AI가 과거 대화를 참조합니다.

### 아키텍처
```
사용자 메시지 → EmbeddingService.generateEmbedding()
                ↓
            Vector 검색 (pgvector)
                ↓
    VectorSearchRepository.searchConversationMemories()
                ↓
            관련 기억 3개 반환 → AI 프롬프트에 포함
```

### 핵심 컴포넌트
- **EmbeddingService**: OpenAI text-embedding-3-small (1536차원) 임베딩 생성
- **VectorSearchRepository**: pgvector 코사인 유사도 검색
- **conversation_memories 테이블**: 10개 메시지마다 자동 요약 저장
- **임베딩 배치 작업**: 매일 자정 누락된 메시지 임베딩 처리

### 임베딩 관련 중요 사항
- **embeddedAt 필드 사용**: Prisma에서 `embedding` 필드는 where 절에서 사용 불가 (Unsupported type)
- **해결 방법**: `embeddedAt IS NULL` 또는 `embeddedAt IS NOT NULL`로 임베딩 여부 확인
- **예시**:
```typescript
// ❌ 작동 안 함
await prisma.message.findMany({ where: { embedding: null } });

// ✅ 올바름
await prisma.message.findMany({ where: { embeddedAt: null } });
```

### 임베딩 배치 작업 실행
```bash
cd apps/api
node run-embedding.mjs  # 수동 실행 (개발용)
```

### 메시지 히스토리 설정
- 현재: 최근 **50개** 메시지를 AI에 전달 (ChatService.ts)
- RAG와 조합하여 장기 기억 + 단기 기억 구현

## NSFW 모델 지원

### 모델 자동 선택 로직
캐릭터가 NSFW로 표시된 경우 NSFW 가능 모델을 자동 선택합니다.

**우선순위**:
1. 캐릭터 지정 모델 (`character.defaultLlmModelId`)
2. 사용자 선택 모델 (`profile.chosenLlmModel`)
3. NSFW 캐릭터면 NSFW 기본 모델, 아니면 일반 기본 모델

### 관련 필드
- `LlmModel.isNsfwCapable`: 모델이 NSFW 콘텐츠 생성 가능한지 여부
- `LlmModel.isDefaultNsfw`: NSFW 캐릭터의 기본 모델
- `Character.isNsfw`: 캐릭터가 NSFW 콘텐츠를 포함하는지 여부
- `Character.defaultLlmModelId`: 캐릭터별 기본 모델 지정 (선택)

## 스트리밍 중단 처리

### 클라이언트 연결 끊김 감지
AI 스트리밍 중 사용자가 중단 버튼을 누르면 서버가 즉시 감지하고 스트림을 취소합니다.

**구현 위치**: `apps/api/src/services/ai-streaming.service.ts`

```typescript
// 클라이언트 연결 끊김 이벤트 리스너
reply.raw.on('close', () => {
  clientDisconnected = true;
  reader.cancel();  // AI 서버 스트림 즉시 취소
});

// 루프 내에서 연결 상태 체크
while (true) {
  if (clientDisconnected || reply.raw.destroyed) {
    reader.cancel();
    break;
  }
  // ...
}
```

### 부분 메시지 저장
중단 시 현재까지 생성된 내용을 자동으로 DB에 저장합니다.

```typescript
finally {
  if (clientDisconnected && accumulated) {
    await prisma.message.update({
      where: { id: messageId },
      data: {
        content: accumulated,
        metadata: { aborted: true }
      }
    });
    await gemService.deductGems(userId, gemCost, messageId);
  }
}
```

## 환경 변수
- `DATABASE_URL`: PostgreSQL 연결 (Transaction Pooler 사용)
- `DIRECT_URL`: Prisma 마이그레이션용 직접 연결
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase 인증
- `AI_SERVER_URL`: AI 서버 내부 URL
- `OPENROUTER_API_KEY`: OpenRouter LLM API 키
- `OPENAI_API_KEY`: OpenAI 임베딩 API 키 (RAG용)
- `NEXT_PUBLIC_*`: 프론트엔드 환경 변수 (빌드 시 인라인)

## 배포
- **개발**: `pnpm dev` (모든 서비스 병렬 실행)
- **프로덕션**: Docker Compose (`docker-compose -f docker-compose.prod.yml up -d`)
- **CI/CD**: GitHub Actions → AWS EC2 배포 (`.github/workflows/deploy.yml`)
- **로그**: `logs/api/api.log`, `logs/ai/ai-server.log`

## 테스팅
- API: Vitest (`apps/api/src/**/__tests__/*.test.ts`)
- 프론트엔드: Playwright E2E (`apps/web/tests/`)
- 부하 테스트: k6 (`load-tests/`)

## 참고 문서
- `README.md`: 전체 프로젝트 개요, 기술 스택, 빠른 시작
- `API_QUICKSTART.md`: API 서버 설정, 엔드포인트 테스트, 성능 패턴
- `docs/ARCHITECTURE.md`: Clean Architecture, Repository 패턴 상세 설명
- `docs/ROLLING_UPDATE.md`: 무중단 배포 전략 (Docker Swarm, Blue-Green)
