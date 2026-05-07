# CLAUDE.md — AI 캐릭터 챗봇 포트폴리오 프로젝트

> **참고 서비스**: whif.io (AI 캐릭터 롤플레이 챗봇 서비스)
> **목적**: 취업 포트폴리오 — 실제 서비스 API 구조 분석 기반으로 유사 서비스 구현

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | (가칭) Persona Chat |
| 설명 | AI 캐릭터와 롤플레이 대화를 나눌 수 있는 챗봇 서비스 |
| 구현 페이지 | 메인(캐릭터 목록/검색), 로그인, 마이페이지, 캐릭터 상세, 캐릭터 대화 |

---

## 2. 모노레포 구조

> **[학습 포인트]** 모노레포는 여러 앱/패키지를 하나의 저장소에서 관리하는 방식.
> `pnpm workspaces`를 사용하며, 루트 `package.json`에 `workspaces` 필드로 선언한다.
> 핵심 장점: `packages/shared-types`처럼 FE/BE 공통 타입을 한 번만 정의하고 양쪽에서 import 가능.

```
persona-chat/                        # 루트 (pnpm workspace root)
├── CLAUDE.md
├── package.json                     # { "workspaces": ["apps/*", "packages/*"] }
├── pnpm-workspace.yaml
├── turbo.json                       # Turborepo 빌드 캐시 설정 (선택)
├── .github/
│   └── workflows/
│       ├── ci.yml                   # PR 시 lint + test + build 검증
│       └── deploy.yml               # main 브랜치 머지 시 배포
│
├── apps/
│   ├── web/                         # Next.js 15 (App Router)
│   ├── api/                         # Node.js Fastify 서버
│   └── ai-server/                   # Python FastAPI 서버
│
└── packages/
    ├── shared-types/                 # FE/BE 공유 TypeScript 타입
    │   └── src/
    │       ├── character.ts
    │       ├── persona.ts
    │       ├── chat.ts
    │       └── index.ts
    └── proto/                        # ConnectRPC .proto 파일 및 생성 코드
        ├── character.proto
        ├── chat.proto
        └── gen/                      # buf generate로 자동 생성 (커밋 포함)
            ├── ts/                   # FE용 생성 코드
            └── js/                   # BE용 생성 코드
```

---

## 3. 기술 스택 전체

### Frontend (`apps/web`)
| 스택 | 용도 |
|---|---|
| Next.js 15 (App Router) | 웹 프레임워크 |
| TypeScript | 타입 세이프 개발 |
| Zustand | 전역 상태 (인증, 현재 채팅방) |
| React Query (TanStack Query) | 서버 상태 캐싱/동기화 |
| Emotion + Tailwind + Shadcn | 스타일링 |
| ConnectRPC (`@connectrpc/connect-web`) | Fastify API 통신 (타입 세이프) |
| Vitest + Playwright | 단위/E2E 테스트 |

### Backend API (`apps/api`)
| 스택 | 용도 |
|---|---|
| Node.js + Fastify | 고성능 API 서버 |
| TypeScript | 타입 세이프 개발 |
| ConnectRPC (`@connectrpc/connect-fastify`) | RPC 엔드포인트 |
| Prisma | ORM (DB 접근 레이어) |
| Supabase Auth | JWT 인증 (이메일 + Google OAuth) |
| Swagger/OpenAPI (`@fastify/swagger`) | REST 엔드포인트 자동 문서화 |
| PortOne (포트원 V2) | 젬 충전 결제 |

### Backend AI (`apps/ai-server`)
| 스택 | 용도 |
|---|---|
| Python + FastAPI | AI 전담 서버 |
| Anthropic Claude API | 주력 LLM |
| OpenRouter | 멀티 LLM 라우팅 (Claude · Gemini 등) |
| Google Vertex AI | LLM 백엔드 옵션 (OpenRouter 경유) |
| Langfuse | LLM 호출 로깅 · 트레이싱 · 평가 |
| SSE (Server-Sent Events) | AI 응답 실시간 스트리밍 |

### Infrastructure
| 스택 | 용도 |
|---|---|
| Supabase | PostgreSQL + Auth + Storage |
| Docker + docker-compose | 로컬 개발 환경 |
| GitHub Actions | CI/CD 파이프라인 |

---

## 4. ConnectRPC 설계

> **[학습 포인트]** ConnectRPC는 Protocol Buffers(.proto)로 API 인터페이스를 정의하면
> 클라이언트·서버 코드를 자동 생성해주는 타입 세이프 RPC 프레임워크.
> REST와 달리 요청/응답 타입이 .proto에서 단일 정의되므로 FE/BE 타입 불일치가 원천 차단된다.
>
> **설치**: `buf` CLI로 .proto → TypeScript 코드 생성
> ```bash
> # buf.gen.yaml 설정 후:
> buf generate
> # packages/proto/gen/ 하위에 타입 + 클라이언트 코드 자동 생성
> ```

### `.proto` 정의 예시 (`packages/proto/character.proto`)
```protobuf
syntax = "proto3";
package persona.v1;

service CharacterService {
  rpc ListCharacters(ListCharactersRequest) returns (ListCharactersResponse);
  rpc GetCharacter(GetCharacterRequest) returns (GetCharacterResponse);
  rpc CreateCharacter(CreateCharacterRequest) returns (CreateCharacterResponse);
}

message ListCharactersRequest {
  optional string keyword = 1;    // 태그 필터
  optional string name    = 2;    // 이름 검색
  int32 limit             = 3;
  int32 offset            = 4;
}
// ... 나머지 message 정의
```

### ConnectRPC 적용 범위
| 적용 | 미적용 (REST 유지) |
|---|---|
| 캐릭터 CRUD | AI 스트리밍 (`/v1/chats`) |
| 페르소나 CRUD | 인증 (`/auth/*`) |
| 채팅방 CRUD | SSE 알림 스트림 |
| LLM 모델 선택 | PortOne 웹훅 수신 |

> **이유**: SSE 스트리밍과 OAuth 콜백은 ConnectRPC보다 REST/HTTP가 더 자연스럽다.
> 실무에서도 두 방식을 혼용하는 것이 일반적.

---

## 5. 데이터베이스 스키마

### 핵심 테이블 목록
```
profiles                  사용자 프로필
llm_models                선택 가능한 LLM 모델
gem_wallets               사용자 보유 젬
gem_logs                  젬 사용/충전 내역
gem_orders                결제 주문 (PortOne 연동)
characters                캐릭터
universes                 세계관/시리즈
character_conversation_stats  대화 통계 (집계)
popular_keywords          인기 태그
user_personas             사용자 페르소나
chat_rooms                채팅방
messages                  대화 메시지
message_versions          메시지 재생성 버전
announcement_popup        공지 팝업
```

### 주요 스키마 (`prisma/schema.prisma` 기준)

```prisma
model Profile {
  id                String    @id                    // Supabase Auth user.id
  email             String
  displayName       String
  avatarUrl         String?
  isAdmin           Boolean   @default(false)
  isAdultUser       Boolean   @default(false)
  chosenLlmModelId  String?
  introduction      String    @default("")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  chosenLlmModel    LlmModel?    @relation(fields: [chosenLlmModelId], references: [id])
  characters        Character[]
  personas          UserPersona[]
  chatRooms         ChatRoom[]
  gemWallet         GemWallet?
  gemLogs           GemLog[]
}

model LlmModel {
  id          String  @id @default(uuid())
  name        String                           // "아이리스 모델" 등 추상화된 명칭
  description String
  gemCost     Int                              // 메시지 1회 소모 젬
  maxTokens   Int
  // 실제 라우팅에 사용할 OpenRouter 슬러그 (FE에 노출 안 함)
  // 예: "anthropic/claude-3-5-sonnet", "google/gemini-2.5-pro"
  routerSlug  String
  createdAt   DateTime @default(now())
}

model GemWallet {
  id                   String   @id @default(uuid())
  userId               String   @unique
  freeDailyGemAmount   Int      @default(200)
  freePromoGemAmount   Int      @default(0)
  paidGemAmount        Int      @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user  Profile @relation(fields: [userId], references: [id])
}

model GemOrder {
  id              String   @id @default(uuid())
  userId          String
  portoneOrderId  String   @unique   // PortOne에서 발급한 주문 ID
  amount          Int                // 결제 금액 (원)
  gemAmount       Int                // 충전될 젬 수량
  status          String             // 'pending' | 'paid' | 'failed' | 'cancelled'
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Character {
  id                   String   @id @default(uuid())
  name                 String
  description          String   @default("")
  avatarUrl            String?
  gender               String?
  keywords             String[]                    // 태그 배열
  isPublic             Boolean  @default(false)
  isAdultContent       Boolean  @default(false)
  status               String   @default("active") // active | inactive | deleted
  note                 String?                     // 작가 노트 (공개)
  introduction         String?
  data                 Json                        // { type, description, first_messages }
  lorebook             Json?
  images               Json?                       // 감정별 이미지 슬러그
  isRelationshipEnabled Boolean @default(false)
  createdBy            String
  userId               String
  universeId           String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  creator    Profile    @relation(fields: [createdBy], references: [id])
  universe   Universe?  @relation(fields: [universeId], references: [id])
  chatRooms  ChatRoom[]
}

model UserPersona {
  id        String   @id @default(uuid())
  userId    String
  name      String
  persona   String                         // AI 프롬프트에 주입되는 페르소나 설명
  gender    String?
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      Profile    @relation(fields: [userId], references: [id])
  chatRooms ChatRoom[]
}

model ChatRoom {
  id                  String   @id @default(uuid())
  userId              String
  characterId         String
  title               String
  customTitle         String?
  userPersonaId       String?
  userNote            String?
  promptMode          String   @default("GENERAL")
  conversationSummary String?                       // 장기 대화 컨텍스트 압축용 요약
  lastMessageAt       DateTime?
  isDeleted           Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user      Profile      @relation(fields: [userId], references: [id])
  character Character    @relation(fields: [characterId], references: [id])
  persona   UserPersona? @relation(fields: [userPersonaId], references: [id])
  messages  Message[]
}

model Message {
  id              String   @id @default(uuid())
  chatRoomId      String
  senderType      String                    // 'user' | 'character' | 'system'
  content         String
  llmSlug         String?                   // 실제 사용된 모델 (로깅용)
  isDeleted       Boolean  @default(false)
  hasVersions     Boolean  @default(false)
  activeVersionId String?
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  chatRoom ChatRoom         @relation(fields: [chatRoomId], references: [id])
  versions MessageVersion[]
}

model MessageVersion {
  id            String   @id @default(uuid())
  messageId     String
  versionNumber Int
  content       String
  createdAt     DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id])
}
```

**LLM 모델 Seed 데이터**:
| name | gemCost | maxTokens | routerSlug |
|---|---|---|---|
| 프리즘 모델 | 24 | 3250 | `anthropic/claude-3-haiku` |
| 아이리스 모델 | 64 | 3250 | `anthropic/claude-sonnet-4-5` |
| 벨벳 모델 | 80 | 1200 | `google/gemini-2.5-pro` |

---

## 6. API 설계

### 6-1. ConnectRPC 엔드포인트 (Fastify)
> proto 정의 기반으로 자동 생성. `/proto` prefix로 마운트.

```
CharacterService.ListCharacters     캐릭터 목록 (필터/검색/페이지네이션)
CharacterService.GetCharacter       캐릭터 상세
CharacterService.CreateCharacter    캐릭터 등록
CharacterService.UpdateCharacter    캐릭터 수정
CharacterService.DeleteCharacter    캐릭터 삭제

PersonaService.ListPersonas         내 페르소나 목록
PersonaService.CreatePersona        페르소나 생성
PersonaService.UpdatePersona        페르소나 수정
PersonaService.DeletePersona        페르소나 삭제
PersonaService.SetDefaultPersona    기본 페르소나 지정

ChatRoomService.ListChatRooms       내 채팅방 목록
ChatRoomService.CreateChatRoom      채팅방 생성
ChatRoomService.DeleteChatRoom      채팅방 삭제

LlmModelService.ListModels          모델 목록
LlmModelService.GetCurrentModel     현재 선택 모델
LlmModelService.UpdateCurrentModel  모델 변경
```

### 6-2. REST 엔드포인트 (Fastify)
> Swagger 자동 문서화 적용. `http://localhost:3000/docs`에서 확인.

```
POST   /auth/login              Supabase 이메일 로그인
POST   /auth/signup             이메일 회원가입
POST   /auth/logout             로그아웃
GET    /auth/me                 내 프로필
GET    /auth/callback           Google OAuth 콜백 처리 (Next.js Route Handler)

GET    /keywords                인기 태그 목록
GET    /announcements           활성 공지 팝업

GET    /mypage/wallet           보유 젬 조회
GET    /mypage/gem-logs         젬 사용/충전 내역

POST   /payments/prepare        결제 준비 (PortOne 주문 ID 생성)
POST   /payments/confirm        결제 검증 및 젬 충전
POST   /payments/webhook        PortOne 웹훅 수신 (서버 → 서버)

GET    /chat-rooms/:id/messages         대화 메시지 조회
PATCH  /messages/:id                    메시지 내용 수정
GET    /messages/:id/versions           메시지 버전 목록
```

### 6-3. AI 서버 엔드포인트 (FastAPI)
```
GET    /health                          헬스체크

POST   /v1/chats?stream=true            대화 전송 → SSE 스트리밍 응답
POST   /v1/chats/reroll?stream=true     답변 재생성 → SSE 스트리밍
POST   /v1/feedback                     채팅 피드백 (👍/👎)

GET    /v1/notifications/stream         SSE 연결 유지 / 하트비트
```

---

## 7. AI 대화 스트리밍 (SSE)

### 흐름
```
1. FE → Fastify(REST): 채팅방 ID + 사용자 메시지 전송
2. Fastify: messages 테이블에 user 메시지 저장
3. Fastify: AI 응답용 빈 character 메시지 사전 생성 (ID 확보)
4. Fastify → FastAPI: POST /v1/chats?stream=true 호출
5. FastAPI → OpenRouter → LLM: 프롬프트 전송
6. FastAPI: 청크 수신 즉시 SSE 이벤트로 Fastify에 전달
7. Fastify: SSE 이벤트를 FE로 relay
8. is_final_event: true 수신 시:
   - messages 테이블 content 업데이트
   - gem_wallets에서 gem_cost만큼 차감
   - gem_logs에 사용 기록
```

### SSE 이벤트 포맷
```
# 스트리밍 중
data: {"event_id": 0, "content": "안녕", "is_final_event": false}
data: {"event_id": 1, "content": "안녕하세요", "is_final_event": false}

# 완료
data: {"event_id": N, "content": "전체 누적 내용", "is_final_event": true, "model": "anthropic/claude-sonnet-4-5"}

# 재생성 완료 시 추가 필드
data: {"is_final_event": true, "versions": [...], "active_version_id": "uuid", "message_id": "uuid"}
```

### AI 프롬프트 구성
```python
# apps/ai-server/app/services/prompt_builder.py

system_prompt = f"""
{character.data['description']}          # 캐릭터 상세 설정

[세계관]
{character.lorebook}                     # 로어북 (있을 경우)

[유저 페르소나]
{user_persona.persona}                   # 유저가 설정한 페르소나

[유저 메모]
{chat_room.user_note}                    # 채팅방별 보조 설정

[대화 요약]
{chat_room.conversation_summary}         # 장기 대화 컨텍스트 압축 요약
"""
# messages_history: 최근 20개 메시지 배열
```

---

## 8. OpenRouter 연동

> **[학습 포인트]** OpenRouter는 Claude, Gemini, GPT 등 다양한 LLM을 단일 API로 호출할 수 있는
> 라우팅 서비스. OpenAI 호환 API를 제공하므로 `base_url`만 바꾸면 모델 전환이 가능.
> 실무에서는 비용 최적화 및 모델 failover에 활용.
>
> **설치**: `pip install openai` (OpenAI SDK로 호출 가능)

```python
# apps/ai-server/app/services/llm_service.py

from openai import AsyncOpenAI

# OpenRouter는 OpenAI 호환 API → base_url만 변경
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)

async def stream_chat(model_slug: str, messages: list, max_tokens: int):
    # model_slug 예: "anthropic/claude-sonnet-4-5", "google/gemini-2.5-pro"
    response = await client.chat.completions.create(
        model=model_slug,
        messages=messages,
        max_tokens=max_tokens,
        stream=True,
        extra_headers={
            "HTTP-Referer": "https://persona-chat.dev",  # OpenRouter 필수 헤더
            "X-Title": "Persona Chat",
        },
    )
    async for chunk in response:
        yield chunk.choices[0].delta.content or ""
```

> **Google Vertex AI**: OpenRouter를 통해 `google/gemini-2.5-pro` 슬러그로 호출.
> 직접 Vertex AI SDK를 붙이지 않고 OpenRouter가 중간에서 라우팅해줌.
> 직접 연동이 필요하다면 `google-cloud-aiplatform` SDK 사용.

---

## 9. Langfuse 연동

> **[학습 포인트]** Langfuse는 LLM 호출을 추적(trace)하고 비용·레이턴시·품질을 모니터링하는
> 옵저버빌리티 도구. 각 대화 요청을 "trace"로 기록하고, 사용자 피드백을 연결할 수 있음.
> 포트폴리오에서는 "AI 품질 관리 인프라를 갖췄다"는 어필 포인트가 된다.
>
> **설치**: `pip install langfuse`
> **무료 클라우드**: https://cloud.langfuse.com (계정 생성 후 키 발급)

```python
# apps/ai-server/app/services/llm_service.py

from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse(
    public_key=settings.LANGFUSE_PUBLIC_KEY,
    secret_key=settings.LANGFUSE_SECRET_KEY,
    host="https://cloud.langfuse.com",
)

@observe()  # 이 데코레이터 하나로 호출 전체가 Langfuse에 자동 기록됨
async def stream_chat_with_trace(
    room_id: str,
    user_id: str,
    model_slug: str,
    messages: list,
    max_tokens: int,
):
    # 추가 메타데이터 태깅 (Langfuse 대시보드에서 필터링 가능)
    langfuse_context.update_current_trace(
        user_id=user_id,
        session_id=room_id,
        tags=["chat", model_slug],
    )
    async for chunk in stream_chat(model_slug, messages, max_tokens):
        yield chunk

# 사용자 피드백 연결 (POST /v1/feedback 엔드포인트에서 호출)
def record_feedback(message_id: str, positive: int, comment: str):
    langfuse.score(
        trace_id=message_id,     # message_id를 trace_id로 사용
        name="user_feedback",
        value=positive,           # 1(좋아요) / 0(싫어요)
        comment=comment,
    )
```

---

## 10. PortOne 결제 연동

> **[학습 포인트]** PortOne V2는 한국 주요 PG사를 통합한 결제 SDK.
> 젬 충전 플로우: FE에서 결제 UI 호출 → PortOne 서버에서 결제 처리 → 웹훅으로 서버에 통보 → 젬 지급.
> **테스트 결제**: PortOne 대시보드에서 "테스트 환경" 선택 후 테스트 채널 사용.
>   - 카카오페이 테스트: `kakaopay.TC0ONETIME` (채널 키)
>   - 토스페이먼츠 테스트: `tosspayments.tosstest` (채널 키)
>   - 실제 카드 번호 없이 테스트 결제 완료 가능

### 결제 플로우
```
1. FE: 젬 상품 선택 → POST /payments/prepare 호출
2. Fastify: gem_orders 테이블에 pending 주문 생성 → orderId 반환
3. FE: PortOne SDK로 결제창 호출 (orderId 전달)
4. 사용자: 결제 완료 (테스트 카드 사용)
5. FE: POST /payments/confirm 호출 (paymentId 전달)
6. Fastify: PortOne API로 결제 검증 → gem_orders 상태 'paid' 업데이트 → 젬 지급
7. (병행) PortOne 웹훅 → POST /payments/webhook → 서버측 이중 검증
```

### 젬 상품 구성 (하드코딩)
```typescript
// apps/api/src/constants/gem-products.ts
export const GEM_PRODUCTS = [
  { id: 'gem_500',  gemAmount: 500,  price: 1100  },  // 1,100원
  { id: 'gem_1200', gemAmount: 1200, price: 2200  },  // 2,200원
  { id: 'gem_3000', gemAmount: 3000, price: 5500  },  // 5,500원
] as const;
```

### Fastify 결제 API
```typescript
// POST /payments/prepare
// Body: { productId: string }
// Response: { orderId: string, amount: number, gemAmount: number }

// POST /payments/confirm
// Body: { paymentId: string, orderId: string }
// 내부: PortOne API GET /payments/{paymentId} 로 금액 검증 후 젬 지급
```

---

## 11. GitHub Actions CI/CD

> **[학습 포인트]** GitHub Actions는 PR/push 이벤트에 반응해 자동으로 테스트·빌드·배포를 실행.
> 모노레포에서는 변경된 앱만 선택적으로 빌드하는 것이 효율적 (Turborepo의 `--filter` 활용).

### CI 파이프라인 (`.github/workflows/ci.yml`)
```yaml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # 변경된 패키지만 빌드 (Turborepo 캐시 활용)
      - run: pnpm turbo lint build test --filter=[HEAD^1]

      # Python AI 서버 테스트
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: |
          cd apps/ai-server
          pip install -r requirements.txt
          pytest
```

### 환경 변수 관리
```
GitHub 저장소 Settings → Secrets and variables → Actions 에 등록:
  ANTHROPIC_API_KEY
  OPENROUTER_API_KEY
  LANGFUSE_PUBLIC_KEY
  LANGFUSE_SECRET_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  PORTONE_API_SECRET
```

---

## 12. 구현 페이지별 API 매핑

### 메인 페이지
| 기능 | 호출 |
|---|---|
| 캐릭터 목록 | ConnectRPC `CharacterService.ListCharacters` |
| 인기 태그 | REST `GET /keywords` |
| 공지 팝업 | REST `GET /announcements` |
| 태그/이름 검색 | ConnectRPC `CharacterService.ListCharacters` (필터 파라미터) |

### 로그인 페이지
| 기능 | 호출 |
|---|---|
| 이메일 로그인 | REST `POST /auth/login` (Supabase Auth 위임) |
| Google 로그인 | Supabase OAuth `signInWithOAuth({ provider: 'google' })` |

> **Google OAuth 설정**: Google Cloud Console → OAuth 클라이언트 ID 생성 (웹 애플리케이션)
> → Authorized redirect URIs에 `https://<프로젝트>.supabase.co/auth/v1/callback` 추가
> → Supabase 대시보드 Auth > Providers > Google에 Client ID / Secret 입력
> → 기업 등록 불필요, 개인 Google 계정으로 즉시 설정 가능

### 마이페이지
| 기능 | 호출 |
|---|---|
| 내 프로필 | REST `GET /auth/me` |
| 보유 젬 | REST `GET /mypage/wallet` |
| 젬 사용 내역 | REST `GET /mypage/gem-logs` |
| 젬 충전 결제 | REST `POST /payments/prepare` → PortOne SDK → `POST /payments/confirm` |
| 내 캐릭터 목록 | ConnectRPC `CharacterService.ListCharacters` (내 캐릭터 필터) |
| 캐릭터 등록/수정 | ConnectRPC `CharacterService.CreateCharacter / UpdateCharacter` |
| 페르소나 관리 | ConnectRPC `PersonaService.*` |
| LLM 모델 변경 | ConnectRPC `LlmModelService.UpdateCurrentModel` |

### 캐릭터 상세 페이지
| 기능 | 호출 |
|---|---|
| 캐릭터 정보 | ConnectRPC `CharacterService.GetCharacter` |
| 채팅방 생성 | ConnectRPC `ChatRoomService.CreateChatRoom` |

### 캐릭터 대화 페이지
| 기능 | 호출 |
|---|---|
| 이전 메시지 | REST `GET /chat-rooms/:id/messages` |
| 메시지 전송 | REST `POST /v1/chats?stream=true` (AI 서버, SSE) |
| 답변 재생성 | REST `POST /v1/chats/reroll?stream=true` (AI 서버, SSE) |
| 버전 조회 | REST `GET /messages/:id/versions` |
| 피드백 | REST `POST /v1/feedback` (AI 서버) |
| SSE 유지 | REST `GET /v1/notifications/stream` (하트비트) |

---

## 13. 환경 변수

### `apps/api/.env`
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."           # Prisma Migration 전용
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
AI_SERVER_URL="http://ai-server:8000"
PORTONE_API_SECRET="..."                # PortOne 대시보드에서 발급
PORT=3000
NODE_ENV=development
```

### `apps/ai-server/.env`
```env
ANTHROPIC_API_KEY="sk-ant-..."
OPENROUTER_API_KEY="sk-or-..."          # https://openrouter.ai/keys
LANGFUSE_PUBLIC_KEY="pk-lf-..."         # https://cloud.langfuse.com
LANGFUSE_SECRET_KEY="sk-lf-..."
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
DATABASE_URL="postgresql://..."
PORT=8000
```

---

## 14. 개발 순서 (포트폴리오 구현 우선순위)

```
Phase 1 — 기반
  □ pnpm 모노레포 + Turborepo 설정
  □ Supabase 프로젝트 생성
  □ Prisma 스키마 작성 + 마이그레이션 + Seed
  □ Fastify 서버 기본 설정 (Swagger, JWT, CORS)
  □ Next.js 프로젝트 초기화

Phase 2 — 인증 + 기본 CRUD
  □ 이메일 로그인/회원가입 (Supabase Auth)
  □ Google OAuth 로그인 (Supabase signInWithOAuth)
  □ ConnectRPC + buf 세팅 (.proto 정의 + 코드 생성)
  □ 캐릭터 CRUD (ConnectRPC)
  □ 페르소나 CRUD (ConnectRPC)

Phase 3 — AI 대화 (핵심)
  □ FastAPI AI 서버 기본 설정
  □ OpenRouter 연동 + 스트리밍 구현
  □ Langfuse 트레이싱 연결
  □ SSE 스트리밍 FE 연동
  □ 답변 재생성 + 버전 관리

Phase 4 — 부가 기능
  □ 젬 시스템 (보유/사용 내역)
  □ PortOne 결제 (테스트 결제)
  □ 인기 태그 / 통계 집계

Phase 5 — 마무리
  □ GitHub Actions CI 파이프라인
  □ Docker Compose 통합
  □ Swagger 문서 정리
  □ README 작성
```

---

*이 문서는 whif.io 서비스 API 분석을 기반으로 역설계한 포트폴리오 설계 문서입니다.*
