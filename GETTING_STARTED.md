# Persona Chat 시작하기

Persona Chat 모노레포를 로컬에서 설정하고 실행하기 위한 완전한 가이드입니다.

## 사전 요구사항

- **Node.js**: >= 20.0.0 ([다운로드](https://nodejs.org/))
- **pnpm**: >= 9.0.0 (설치: `npm install -g pnpm`)
- **Python**: >= 3.12 ([다운로드](https://www.python.org/))
- **Supabase 계정**: ([가입하기](https://supabase.com))
- **Git**: 버전 관리용

## 단계별 설정

### 1. 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <your-repo-url>
cd mini-whif

# 모든 워크스페이스 의존성 설치
pnpm install
```

다음 항목에 대한 의존성이 설치됩니다:

- 루트 워크스페이스
- `packages/shared-types`
- `packages/proto`
- `apps/api`
- `apps/web` (생성 시)

### 2. Supabase 설정

#### 새 프로젝트 생성

1. [Supabase 대시보드](https://supabase.com/dashboard)로 이동
2. "New Project" 클릭
3. 입력:
   - **Name**: persona-chat
   - **Database Password**: (안전하게 저장)
   - **Region**: 가장 가까운 지역 선택
4. 프로젝트 프로비저닝 대기 (~2분)

#### 자격 증명 가져오기

1. **Settings** > **Data API**로 이동
2. 복사:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon/public key**: `eyJ...` (eyJ로 시작, API Key에서 legacy 탭으로 이동하여 획득)
   - **service_role key**: `eyJ...` (비밀 유지 - 서버 전용, API Key에서 legacy 탭으로 이동하여 획득)

3. 상단의 **Connect 클릭** > **Direct Connection string 클릭**
4. 복사:
   - **Transaction mode의 Connection string** (DATABASE_URL용)
   - **Session mode의 Connection string** (DIRECT_URL용)

### 3. 환경 변수 구성

```bash
# 템플릿 복사
cp .env.example .env

# 자격 증명으로 .env 편집
```

**필수 변수**:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database (Transaction pooler - port 6543)
DATABASE_URL=postgresql://postgres.abcdef:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Database (Session pooler - port 5432)
DIRECT_URL=postgresql://postgres.abcdef:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# API Server
NEXT_PUBLIC_API_URL=http://localhost:3000
AI_SERVER_URL=http://localhost:8000

# Frontend
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**선택 변수** (전체 기능용):

```env
# OpenRouter (AI 응답용)
OPENROUTER_API_KEY=sk-or-v1-...

# Langfuse (LLM 모니터링/분석용)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# PortOne (결제용 - 한국 사업자 필요)
PORTONE_SHOP_ID=
PORTONE_API_KEY=
```

### 4. Protocol Buffer 코드 생성

```bash
pnpm proto:gen
```

타입 안전 RPC를 위해 `.proto` 파일에서 TypeScript 코드를 생성합니다.

**예상 출력**:

```
packages/proto/gen/ts/
├── character_pb.ts
├── character_connect.ts
├── persona_pb.ts
├── persona_connect.ts
├── chatroom_pb.ts
├── chatroom_connect.ts
├── llmmodel_pb.ts
└── llmmodel_connect.ts
```

### 5. 데이터베이스 설정

```bash
cd apps/api
# .env 파일 생성 후 각 값에 맞는 값으로 수정할 것
cp .env.example .env

# Prisma Client 생성
pnpm db:generate

# 마이그레이션 실행 (테이블 생성)
pnpm db:migrate

# 초기 데이터 시딩
pnpm db:seed

# (선택) Prisma Studio를 열어 데이터 보기
pnpm db:studio
```

**시드 데이터 포함**:

- 3개 LLM 모델 (프리즘, 아이리스, 벨벳)
- 22개 인기 키워드 (romance, fantasy, sci-fi 등)
- 1개 데모 세계관

### 6. AI 서버 설정 (Python)

```bash
cd apps/ai-server

# 가상 환경 생성
python -m venv venv

# 가상 환경 활성화
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 환경 파일 복사
cp .env.example .env
# 동일한 Supabase 자격 증명 + OpenRouter 키로 편집
```

### 7. 개발 서버 시작

**3개의 터미널** 열기:

#### 터미널 1: API 서버 (Fastify)

```bash
cd apps/api
pnpm dev
```

**예상 출력**:

```
🚀 Persona Chat API Server
   Server listening on http://localhost:3000
   Swagger docs: http://localhost:3000/docs
```

**확인**:

- http://localhost:3000/health 방문
- `{"status":"ok","timestamp":"..."}` 표시되어야 함

#### 터미널 2: AI 서버 (FastAPI)

```bash
cd apps/ai-server
# 아직 활성화되지 않은 경우 venv 활성화
fastapi dev
```

**예상 출력**:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
INFO:     OpenRouter configured: True/False
INFO:     Langfuse configured: True/False
```

**확인**:

- http://localhost:8000/health 방문
- http://localhost:8000/docs 방문 (FastAPI 대화형 문서)

#### 터미널 3: 프론트엔드 (Next.js)

```bash
cd apps/web
pnpm dev
```

**예상 출력**:

```
  ▲ Next.js 15.0.0
  - Local:        http://localhost:3001
  - Ready in 1.2s
```

### 8. 설정 확인

#### API 헬스 체크

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2024-..."}
```

#### AI 서버 헬스 체크

```bash
curl http://localhost:8000/health
# {"status":"ok","openrouter":"configured","langfuse":"..."}
```

#### 인증 테스트

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "displayName": "Test User"
  }'
```

**예상**: 세션 토큰 + 프로필 데이터 반환

#### Prisma Studio 확인

```bash
cd apps/api
pnpm db:studio
```

http://localhost:5555 열림 - 다음이 표시되어야 함:

- `llm_models`에 3개 레코드
- `keywords`에 22개 레코드
- `profiles`에 생성한 사용자

## 일반적인 문제 및 해결책

### 문제: Prisma 마이그레이션 실패

**에러**: `Can't reach database server`

**해결책**:

1. `.env`의 `DIRECT_URL`이 포트 **5432** 사용 확인 (6543 아님)
2. Supabase 프로젝트가 활성 상태인지 확인 (일시 중지되지 않음)
3. 데이터베이스 비밀번호가 올바른지 확인

### 문제: Proto 생성 실패

**에러**: `buf: command not found`

**해결책**:

```bash
# buf CLI 전역 설치
npm install -g @bufbuild/buf

# 또는 npx 사용
npx @bufbuild/buf generate
```

### 문제: OpenRouter 401 반환

**에러**: `Authentication failed`

**해결책**:

1. `OPENROUTER_API_KEY`가 `sk-or-v1-`로 시작하는지 확인
2. https://openrouter.ai/keys에서 API 키가 활성 상태인지 확인
3. 키가 누락된 경우 서버는 모의 응답 사용 (예상된 동작)

### 문제: Python 의존성 실패

**에러**: 패키지 설치 에러

**해결책**:

```bash
# pip 먼저 업그레이드
python -m pip install --upgrade pip

# 상세 출력으로 설치
pip install -v -r requirements.txt

# 또는 uv 사용 (더 빠름)
pip install uv
uv pip install -r requirements.txt
```

### 문제: 포트가 이미 사용 중

**에러**: `EADDRINUSE: address already in use :::3000`

**해결책**:

```bash
# 포트를 사용하는 프로세스 찾기 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 포트를 사용하는 프로세스 찾기 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# 또는 .env에서 포트 변경
PORT=3001
```

## 개발 워크플로우

### 코드 변경 수행

#### 백엔드 API 변경

1. `apps/api/src/`의 파일 편집
2. 서버 자동 재로드 (tsx watch 모드)
3. 터미널에서 오류 확인
4. http://localhost:3000/docs의 Swagger UI로 테스트

#### AI 서버 변경

1. `apps/ai-server/app/`의 파일 편집
2. 서버 자동 재로드 (fastapi dev)
3. 터미널에서 오류 확인
4. http://localhost:8000/docs의 FastAPI 문서로 테스트

#### Proto 변경

1. `packages/proto/proto/`의 `.proto` 파일 편집
2. `pnpm proto:gen` 실행하여 코드 재생성
3. API 서버 재시작하여 새 타입 사용

#### 데이터베이스 스키마 변경

1. `apps/api/prisma/schema.prisma` 편집
2. `pnpm db:migrate` 실행하여 마이그레이션 생성
3. 마이그레이션이 데이터베이스에 자동 적용됨
4. API 서버 재시작

### 테스트 실행

```bash
# 모든 테스트 실행
pnpm test

# 특정 패키지 테스트 실행
pnpm --filter api test
```

### 린팅 및 포매팅

```bash
# 모든 패키지 린트
pnpm lint

# 모든 코드 포맷
pnpm format
```

## 다음 단계

1. **API 탐색**: http://localhost:3000/docs 방문
2. **캐릭터 생성**: Swagger를 통해 POST `/characters` 사용
3. **채팅 테스트**: 채팅룸을 생성하고 메시지 전송
4. **프론트엔드 빌드**: `apps/web/`에 페이지 구현 (IMPLEMENTATION_STATUS.md 참조)
5. **기능 추가**: 구현 계획 따르기

## 리소스

- [Prisma 문서](https://www.prisma.io/docs)
- [Fastify 문서](https://www.fastify.io/docs)
- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [ConnectRPC 문서](https://connectrpc.com/docs)
- [Supabase 문서](https://supabase.com/docs)
- [OpenRouter 문서](https://openrouter.ai/docs)
- [Turborepo 문서](https://turbo.build/repo/docs)

## 도움 받기

- 현재 진행 상황은 `IMPLEMENTATION_STATUS.md` 확인
- 아키텍처 세부 사항은 `README.md` 검토
- 세부 사항은 개별 패키지 README 확인
- GitHub에 이슈 열기

---

**모든 준비가 완료되었습니다! 즐거운 코딩! 🚀**
