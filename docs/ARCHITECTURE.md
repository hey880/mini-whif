# 아키텍처 가이드

## 개요

Persona Chat은 **Clean Architecture** 원칙을 기반으로 한 레이어드 아키텍처를 사용합니다.
각 레이어는 명확한 책임과 의존성 규칙을 가지며, 테스트 가능성과 유지보수성을 극대화합니다.

## 레이어 구조

```
apps/api/src/
├── domain/                     # 비즈니스 규칙 (가장 내부)
│   └── repositories/           # Repository 인터페이스 (추상)
│       ├── IChatRoomRepository.ts
│       ├── IMessageRepository.ts
│       ├── IGemWalletRepository.ts
│       ├── ICharacterRepository.ts
│       ├── IPersonaRepository.ts
│       ├── IUniverseRepository.ts
│       └── ILlmModelRepository.ts
│
├── application/                # 애플리케이션 로직 (Phase 3)
│   ├── services/               # 비즈니스 로직
│   └── dto/                    # 데이터 전송 객체
│
├── infrastructure/             # 외부 의존성 (가장 외부)
│   ├── repositories/           # Repository 구현 (Prisma)
│   │   ├── PrismaChatRoomRepository.ts
│   │   ├── PrismaMessageRepository.ts
│   │   ├── PrismaGemWalletRepository.ts
│   │   ├── PrismaCharacterRepository.ts
│   │   ├── PrismaPersonaRepository.ts
│   │   ├── PrismaUniverseRepository.ts
│   │   ├── PrismaLlmModelRepository.ts
│   │   └── __tests__/          # Repository 테스트
│   │
│   ├── http/                   # HTTP 레이어
│   │   ├── routes/             # REST 라우트
│   │   └── rpc/                # ConnectRPC 핸들러
│   │
│   └── ai/                     # AI 통합
│       └── AIStreamingService.ts
│
├── config/                     # 설정
│   ├── prisma.ts
│   └── supabase.ts
│
└── index.ts                    # 앱 진입점 (DI 설정)
```

### 의존성 규칙

**핵심 원칙: 외부 레이어는 내부를 알 수 있지만, 내부는 외부를 모른다.**

```
HTTP Layer (routes, handlers)
       ↓ depends on
Application Layer (services)
       ↓ depends on
Domain Layer (interfaces)
       ↑ implemented by
Infrastructure Layer (repositories)
```

## Repository 패턴

### 왜 Repository 패턴인가?

**문제점 (Before):**
- Prisma 직접 호출이 23개 파일에 산재
- 데이터 접근 로직 중복
- 테스트 시 Mock 어려움
- 데이터베이스 교체 시 전체 코드 수정 필요

**해결 (After):**
- 데이터 접근 로직 캡슐화
- 인터페이스로 추상화 (의존성 역전)
- Mock Repository로 쉬운 테스트
- ORM 교체 시 Repository 구현만 변경

### Repository 구조

#### 1. 인터페이스 (Domain Layer)

**위치:** `domain/repositories/I*.ts`

```typescript
// domain/repositories/IChatRoomRepository.ts
export interface IChatRoomRepository {
  findById(id: string, userId: string): Promise<ChatRoomWithRelations | null>;
  findMany(params: FindChatRoomsParams): Promise<{ rooms: ChatRoom[]; total: number }>;
  create(params: CreateChatRoomParams): Promise<ChatRoom>;
  update(id: string, userId: string, data: Partial<ChatRoom>): Promise<ChatRoom>;
  delete(id: string, userId: string): Promise<void>;
  cloneWithMessages(sourceRoomId: string, userId: string): Promise<ChatRoom>;
}
```

**특징:**
- Prisma에 의존하지 않음 (순수 TypeScript)
- 비즈니스 요구사항만 표현
- 권한 검증 명시 (userId 파라미터)

#### 2. 구현 (Infrastructure Layer)

**위치:** `infrastructure/repositories/Prisma*.ts`

```typescript
// infrastructure/repositories/PrismaChatRoomRepository.ts
export class PrismaChatRoomRepository implements IChatRoomRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<ChatRoomWithRelations | null> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
      include: { character: true, persona: true },
    });

    if (!room || room.userId !== userId) {
      return null;
    }

    return room;
  }

  // ... 나머지 구현
}
```

**특징:**
- Prisma Client 사용
- 권한 검증 로직 포함
- Phase 1 최적화 적용 (createMany, select 등)

#### 3. 테스트

**위치:** `infrastructure/repositories/__tests__/*.test.ts`

```typescript
describe('PrismaChatRoomRepository', () => {
  let repo: PrismaChatRoomRepository;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    repo = new PrismaChatRoomRepository(prisma);
  });

  it('should find chat room by id', async () => {
    const room = await repo.findById('room-1', 'user-1');
    expect(room).toBeDefined();
  });
});
```

### 사용 예시

#### Before (Prisma 직접 호출)

```typescript
// ❌ Bad: Prisma 직접 호출
export const chatroomService = {
  async cloneChatRoom(req, context) {
    const sourceRoom = await prisma.chatRoom.findUnique({
      where: { id: req.sourceRoomId },
      include: { messages: true },
    });

    if (!sourceRoom || sourceRoom.userId !== context.user!.id) {
      throw new Error('Forbidden');
    }

    // ... 복잡한 로직
  },
};
```

#### After (Repository 사용)

```typescript
// ✅ Good: Repository 사용
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

## 현재 구현된 Repository (Phase 2)

### 1. ChatRoomRepository
- 채팅방 CRUD
- 메시지 포함 복제 (Phase 1 최적화 적용)
- 권한 검증 (본인 방만 접근)

### 2. MessageRepository
- 메시지 CRUD
- 메시지 페어 생성 (user + AI placeholder)
- 버저닝 지원

### 3. GemWalletRepository
- 잔액 조회
- Gem 차감 (우선순위: 일일 → 프로모 → 유료)
- 일일 무료 Gem 재충전

### 4. CharacterRepository
- 캐릭터 CRUD
- 키워드 검색
- 리스트 조회 최적화 (data, lorebook 제외)

### 5. PersonaRepository
- 페르소나 CRUD
- 기본 페르소나 설정
- 권한 검증

### 6. UniverseRepository
- 세계관 CRUD
- 리스트 조회 최적화 (data, lorebook 제외)

### 7. LlmModelRepository
- 모델 CRUD
- 기본 모델 조회 (가장 저렴한 활성 모델)

## 새 Repository 추가 방법

### 1. 인터페이스 생성

`domain/repositories/IMyRepository.ts`:

```typescript
export interface IMyRepository {
  findById(id: string): Promise<MyEntity | null>;
  // ... 기타 메서드
}
```

### 2. 구현 생성

`infrastructure/repositories/PrismaMyRepository.ts`:

```typescript
export class PrismaMyRepository implements IMyRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<MyEntity | null> {
    return await this.prisma.myEntity.findUnique({ where: { id } });
  }
}
```

### 3. 테스트 작성

`infrastructure/repositories/__tests__/PrismaMyRepository.test.ts`:

```typescript
describe('PrismaMyRepository', () => {
  it('should find entity by id', async () => {
    // ...
  });
});
```

### 4. 사용

```typescript
const myRepo = new PrismaMyRepository(prisma);
const entity = await myRepo.findById('123');
```

## Phase 3: Service 레이어 (예정)

Service 레이어는 복잡한 비즈니스 로직을 캡슐화합니다.

**예정 구조:**
```
application/
├── services/
│   ├── ChatService.ts          # 채팅 비즈니스 로직
│   ├── MessageService.ts       # 메시지 관리
│   ├── CharacterService.ts     # 캐릭터 관리
│   └── GemService.ts           # Gem 관리
└── dto/
    └── SendMessageDto.ts       # 데이터 전송 객체
```

**Service 역할:**
- Repository 조합
- 복잡한 비즈니스 로직
- 트랜잭션 관리
- 이벤트 발행 (선택)

**예시:**
```typescript
export class ChatService {
  constructor(
    private chatRoomRepo: IChatRoomRepository,
    private messageRepo: IMessageRepository,
    private gemService: GemService
  ) {}

  async sendMessage(dto: SendMessageDto) {
    // 1. 권한 검증
    const room = await this.chatRoomRepo.findById(dto.roomId, dto.userId);
    if (!room) throw new ForbiddenError();

    // 2. Gem 차감
    await this.gemService.deduct(dto.userId, room.modelCost);

    // 3. 메시지 생성
    await this.messageRepo.createMessagePair({
      roomId: dto.roomId,
      userContent: dto.content,
    });

    // 4. AI 스트리밍 (별도 서비스)
    // ...
  }
}
```

## 테스트 전략

### 1. Unit 테스트 (Repository)

**대상:** Repository 구현
**방법:** 실제 데이터베이스 사용 (테스트용 Prisma Client)
**목표:** 데이터 접근 로직 검증

```typescript
it('should clone chat room with 100 messages in < 1 second', async () => {
  // Given: 100개 메시지
  // When: 복제
  // Then: 1초 이내 완료
});
```

### 2. Unit 테스트 (Service, Phase 3)

**대상:** Service 로직
**방법:** Mock Repository 사용
**목표:** 비즈니스 로직 검증

```typescript
it('should send message with gem deduction', async () => {
  // Given: Mock Repository
  const mockRepo = { findById: jest.fn(), ... };
  const service = new ChatService(mockRepo, ...);

  // When: 메시지 전송
  // Then: Gem 차감 호출 확인
});
```

### 3. 통합 테스트

**대상:** 전체 플로우
**방법:** 실제 API 호출
**목표:** 엔드투엔드 검증

## 마이그레이션 전략 (Strangler Fig 패턴)

Phase 2에서는 기존 코드와 신규 코드가 공존합니다.

**단계:**
1. Repository 생성 (완료)
2. 일부 핸들러를 Repository로 전환 (Phase 2 후반)
3. 기존/신규 코드 공존하며 프로덕션 검증 (Phase 2-3)
4. 모든 코드 전환 완료 (Phase 3)

**장점:**
- 점진적 변경으로 리스크 최소화
- 각 단계에서 프로덕션 검증
- 롤백 가능

## 성능 최적화 (Phase 1 계승)

Repository 구현에 Phase 1 최적화 적용:

### 1. createMany 사용
```typescript
// cloneWithMessages에서 N+1 쿼리 제거
await tx.message.createMany({
  data: messages.map(msg => ({ ... })),
});
```

### 2. Promise.all 병렬 실행
```typescript
const [rooms, total] = await Promise.all([
  this.prisma.chatRoom.findMany({ ... }),
  this.prisma.chatRoom.count({ ... }),
]);
```

### 3. select로 필드 최적화
```typescript
// 리스트 조회 시 무거운 필드 제외
select: {
  id: true,
  name: true,
  // data, lorebook 제외
}
```

### 4. 트랜잭션
```typescript
// 원자성 보장
return await this.prisma.$transaction(async (tx) => {
  // ...
});
```

## 참고 자료

- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Strangler Fig Pattern](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
