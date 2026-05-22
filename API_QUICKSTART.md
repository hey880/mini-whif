# API 빠른 시작 가이드

## 사전 요구사항

API 서버를 시작하기 전에 다음이 필요합니다:

1. **Supabase 설정** (PostgreSQL 데이터베이스 + Auth)
2. **환경 변수 구성**
3. **데이터베이스 마이그레이션 실행**

---

## Step 1: Supabase 설정

### Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com)로 이동
2. "New Project" 클릭
3. 프로젝트 세부 정보 입력:
   - Name: `persona-chat` (또는 원하는 이름)
   - Database Password: 강력한 비밀번호 생성 (저장!)
   - Region: 가장 가까운 지역 선택

4. 프로젝트 생성 대기 (~2분)

### 자격 증명 가져오기

생성 후 **Settings > API**로 이동:

- **Project URL**: `https://xxxxx.supabase.co`
- **anon/public key**: `eyJhbGc...` (프론트엔드용)
- **service_role key**: `eyJhbGc...` (백엔드용 - 비밀 유지!)

**Settings > Database**로 이동:

- **Connection string**: `postgresql://postgres.xxxxx...`
- **Connection pooling**: Transaction 모드 URL (API에 더 빠름)

---

## Step 2: 환경 구성

### `.env` 파일 생성

예제 복사:

```bash
cp .env.example .env
```

### 필수 값 입력

`.env`를 편집하고 Supabase 자격 증명 추가:

```env
# Supabase 구성
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...

# Database URLs (Supabase Settings > Database에서)
DATABASE_URL=postgresql://postgres.xxxxx:password@...  # Connection Pooler - Transaction
DIRECT_URL=postgresql://postgres.xxxxx:password@...     # Direct Connection

# API 서버
PORT=3000
NODE_ENV=development

# 프론트엔드 URL (CORS용)
NEXT_PUBLIC_APP_URL=http://localhost:3001

# 선택사항: AI 서버 URL (Phase 3용)
AI_SERVER_URL=http://localhost:8000

# 선택사항: API 키 (나중에 필요에 따라 추가)
# OPENROUTER_API_KEY=
# LANGFUSE_PUBLIC_KEY=
# LANGFUSE_SECRET_KEY=
# PORTONE_API_KEY=
```

**중요**: `DATABASE_URL`에는 **Transaction 모드** connection pooler URL 사용 (API 서버에 더 빠름)

---

## Step 3: 데이터베이스 마이그레이션

### Prisma 마이그레이션 실행

```bash
cd apps/api
pnpm db:migrate
```

다음 작업 수행:
- 데이터베이스에 14개 테이블 전체 생성
- 인덱스 설정 (키워드용 GIN 인덱스 포함)
- 외래 키 관계 구성

### 초기 데이터 시딩

```bash
pnpm db:seed
```

다음 추가:
- 3개 LLM 모델 (프리즘, 아이리스, 벨벳)
- 22개 인기 키워드
- 1개 데모 세계관

### 데이터베이스 확인

Prisma Studio를 열어 데이터 보기:

```bash
pnpm db:studio
```

`http://localhost:5555`가 열리며 테이블을 탐색할 수 있습니다.

---

## Step 4: API 서버 시작

### 개발 모드 (핫 리로드 포함)

```bash
cd apps/api
pnpm dev
```

다음이 표시되어야 합니다:

```
🚀 Persona Chat API Server
   Server listening on http://localhost:3000
   Swagger docs: http://localhost:3000/docs
   ConnectRPC services: CharacterService, PersonaService, ChatRoomService, LlmModelService
```

### 프로덕션 빌드

```bash
pnpm build
pnpm start
```

---

## Step 5: API 테스트

### 옵션 1: Swagger UI (가장 쉬움)

1. [http://localhost:3000/docs](http://localhost:3000/docs) 열기
2. 모든 REST 엔드포인트 탐색
3. "Try it out"을 클릭하여 엔드포인트 테스트
4. Bearer 토큰으로 인증 (signup/login 후)

### 옵션 2: cURL 명령어

#### 헬스 체크

```bash
curl http://localhost:3000/health
```

응답:
```json
{
  "status": "ok",
  "timestamp": "2026-05-06T14:30:00.000Z"
}
```

#### 키워드 가져오기

```bash
curl http://localhost:3000/keywords
```

응답:
```json
{
  "data": [
    {
      "id": "...",
      "keyword": "romance",
      "category": "genre",
      "usageCount": 150,
      ...
    }
  ]
}
```

#### 회원가입

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

응답:
```json
{
  "data": {
    "user": { ... },
    "session": {
      "access_token": "eyJhbGc...",
      ...
    }
  }
}
```

**`access_token`을 저장하세요** - 인증된 요청에 필요합니다!

#### 사용자 프로필 가져오기 (인증됨)

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Gem 지갑 가져오기 (인증됨)

```bash
curl http://localhost:3000/mypage/wallet \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

응답:
```json
{
  "data": {
    "totalGems": 200,
    "paidGemAmount": 0,
    "freeDailyGemAmount": 200,
    "freePromoGemAmount": 0,
    "freeDailyGemLastRefillDate": null
  }
}
```

### 옵션 3: ConnectRPC 클라이언트 (프론트엔드)

ConnectRPC 엔드포인트는 HTTP를 통해 직접 테스트할 수 없습니다 - ConnectRPC 클라이언트가 필요합니다. 이는 Phase 4 (프론트엔드)에서 설정됩니다.

지금 RPC 서비스를 테스트하려면:

1. [Buf Studio](https://buf.build/studio) 사용 (gRPC/ConnectRPC용 웹 UI)
2. `packages/proto`에서 테스트 클라이언트 생성
3. Phase 4의 프론트엔드 구현 대기

---

## 문제 해결

### 포트 3000이 이미 사용 중

`.env`에서 포트 변경:
```env
PORT=3001
```

### 데이터베이스 연결 오류

- `DATABASE_URL`이 올바른지 확인
- Supabase 프로젝트가 활성 상태인지 확인
- pooler 대신 `DIRECT_URL` 사용 시도

### Prisma 클라이언트 오류

Prisma 클라이언트 재생성:
```bash
cd apps/api
pnpm db:generate
```

### TypeScript 오류

프로젝트 재빌드:
```bash
pnpm build
```

### auth/me에서 "User not found"

- JWT 토큰이 만료되었을 수 있음
- 새 토큰을 얻기 위해 다시 signup/login

---

## API 테스팅 워크플로우

### 1. 계정 생성

```bash
POST /auth/signup
```

### 2. 인증 토큰 가져오기

signup 응답에서 `access_token` 저장

### 3. 인증된 엔드포인트 테스트

`Authorization: Bearer TOKEN` 헤더에 토큰 사용

### 4. 캐릭터 생성

```bash
# Phase 4 예정 - ConnectRPC 클라이언트 필요
```

### 5. 채팅룸 생성

```bash
# Phase 4 예정
```

### 6. 메시지 전송 (SSE)

```bash
curl -X POST http://localhost:3000/chat-rooms/ROOM_ID/messages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello!"}'
```

**참고**: AI 서버 없이는 (Phase 3), 모의 응답을 반환합니다.

---

## 다음 단계

### Phase 3: AI 서버

실제 LLM 응답을 처리하기 위한 FastAPI AI 서버 구현:

1. `apps/ai-server/` 설정
2. LLM 호출을 위한 OpenRouter 통합
3. character + persona에서 시스템 프롬프트 구축
4. SSE를 통한 응답 스트리밍
5. Langfuse 관찰성 추가 (선택사항)

### Phase 4: 프론트엔드

Next.js 프론트엔드 빌드:

1. App Router를 사용한 Next.js 15 설정
2. 다크 사이버펑크 디자인 시스템 구현
3. ConnectRPC 클라이언트 생성
4. 5개 주요 페이지 빌드 (Main, Login, Character Detail, Chat, MyPage)
5. SSE 스트리밍 채팅 UI 구현

---

## 개발 팁

### 핫 리로드

API 서버는 코드 변경 시 즉시 리로드하기 위해 `tsx watch` 사용

### 로깅

Pino를 사용한 구조화된 로그:
```typescript
server.log.info({ userId: '123' }, 'User logged in');
server.log.error({ error }, 'Failed to fetch');
```

### 데이터베이스 변경

`schema.prisma` 수정 후:

```bash
pnpm db:migrate
pnpm db:generate
```

### Prisma Studio

데이터베이스 상태 디버깅에 유용:

```bash
pnpm db:studio
```

### API 문서

라우트 스키마를 수정하면 Swagger가 자동 업데이트됩니다.

---

## 프로덕션 배포

### 환경 변수

모든 프로덕션 값 설정:
- 강력한 비밀번호
- 프로덕션 Supabase URL
- 서비스용 API 키
- `NODE_ENV=production`

### 빌드

```bash
pnpm build
```

### 시작

```bash
pnpm start
```

### Docker (선택사항)

Dockerfile은 Phase 5에 추가됩니다.

---

## 성능 고려사항

### N+1 쿼리 방지

대량 데이터 삽입 시 `createMany` 사용:

```typescript
// ❌ Bad: N+1 쿼리
for (const message of messages) {
  await prisma.message.create({ data: message });
}

// ✅ Good: 일괄 삽입
await prisma.message.createMany({
  data: messages,
});
```

### 병렬 쿼리 패턴

독립적인 쿼리는 병렬로 실행:

```typescript
// ❌ Bad: 순차 실행 (300ms)
const user = await prisma.user.findUnique({ where: { id } });
const settings = await prisma.settings.findUnique({ where: { userId: id } });

// ✅ Good: 병렬 실행 (100ms)
const [user, settings] = await Promise.all([
  prisma.user.findUnique({ where: { id } }),
  prisma.settings.findUnique({ where: { userId: id } }),
]);
```

### 트랜잭션 사용

원자성이 필요한 작업은 트랜잭션으로:

```typescript
// ❌ Bad: race condition 가능
await prisma.reaction.create({ data });
await prisma.message.update({
  where: { id },
  data: { count: { increment: 1 } }
});

// ✅ Good: 원자성 보장
await prisma.$transaction([
  prisma.reaction.create({ data }),
  prisma.message.update({
    where: { id },
    data: { count: { increment: 1 } }
  }),
]);
```

### Select로 필요한 필드만 조회

리스트 조회 시 무거운 필드 제외:

```typescript
// ❌ Bad: 모든 필드 로딩 (2초)
const characters = await prisma.character.findMany({ where });

// ✅ Good: 필요한 필드만 조회 (0.3초)
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

---

## Repository 패턴 (Phase 2+)

Phase 2부터 데이터 접근 로직을 Repository 레이어로 분리했습니다.

### Repository 사용 예시

#### Before (Prisma 직접 호출)

```typescript
// ❌ 권한 검증 + 데이터 접근 로직이 산재
export const chatroomService = {
  async cloneChatRoom(req, context) {
    const sourceRoom = await prisma.chatRoom.findUnique({
      where: { id: req.sourceRoomId },
      include: { messages: true },
    });

    if (!sourceRoom || sourceRoom.userId !== context.user!.id) {
      throw new Error('Forbidden');
    }

    // ... 복잡한 복제 로직
  },
};
```

#### After (Repository 사용)

```typescript
// ✅ 데이터 접근 로직 캡슐화
import { PrismaChatRoomRepository } from '../infrastructure/repositories/PrismaChatRoomRepository.js';

export const chatroomService = {
  async cloneChatRoom(req, context) {
    const chatRoomRepo = new PrismaChatRoomRepository(prisma);

    // 권한 검증 + 복제 로직이 Repository에 캡슐화됨
    const clonedRoom = await chatRoomRepo.cloneWithMessages(
      req.sourceRoomId,
      context.user!.id,
      req.newPersonaId
    );

    return { chatRoom: mapToProto(clonedRoom) };
  },
};
```

**개선 효과:**
- 코드 라인 수 50% 감소
- 권한 검증 로직 재사용
- 테스트 시 Mock Repository 사용 가능
- Prisma 교체 시 Repository만 수정

### 사용 가능한 Repository

Phase 2에서 다음 Repository들이 구현되었습니다:

1. **ChatRoomRepository**: 채팅방 CRUD, 메시지 포함 복제
2. **MessageRepository**: 메시지 CRUD, 버저닝
3. **GemWalletRepository**: 잔액 조회, Gem 차감
4. **CharacterRepository**: 캐릭터 CRUD, 키워드 검색
5. **PersonaRepository**: 페르소나 CRUD, 기본 페르소나 설정
6. **UniverseRepository**: 세계관 CRUD
7. **LlmModelRepository**: 모델 CRUD, 기본 모델 조회

자세한 내용은 `docs/ARCHITECTURE.md`를 참조하세요.

---

## 지원

문제 발생 시:
전체 프로젝트 정보는 메인 `README.md` 참조
