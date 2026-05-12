# 채팅 시스템 개선 작업 중 발생한 이슈 및 해결 방법

작업 날짜: 2026-05-12

## 목차
1. [데이터베이스 마이그레이션 연결 타임아웃](#1-데이터베이스-마이그레이션-연결-타임아웃)
2. [Prisma Client 재생성 파일 잠금 에러](#2-prisma-client-재생성-파일-잠금-에러)
3. [TypeScript 타입 에러 (스키마 업데이트 후)](#3-typescript-타입-에러-스키마-업데이트-후)
4. [빌드 권한 에러 (EPERM)](#4-빌드-권한-에러-eperm)

---

## 1. 데이터베이스 마이그레이션 연결 타임아웃

### 이슈 내용
```
Error: P1002
The database server at `aws-1-ap-southeast-1.pooler.supabase.com:5432` was reached but timed out.
Context: Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369)).
Elapsed: 10000ms.
```

Prisma 마이그레이션 실행 시 Supabase 데이터베이스 연결이 10초 후 타임아웃되는 문제가 발생했습니다.

### 원인
1. **Supabase 프로젝트 일시중지**: 무료 플랜의 경우 일정 시간 미사용 시 자동으로 프로젝트가 일시중지됩니다.
2. **PostgreSQL advisory lock 대기**: Prisma는 마이그레이션 중 동시 실행을 방지하기 위해 advisory lock을 획득하려고 시도하지만, 데이터베이스가 응답하지 않아 타임아웃이 발생합니다.
3. **네트워크/방화벽 이슈**: 일부 환경에서 Supabase 연결이 차단될 수 있습니다.

### 해결 방법

#### 방법 1: Supabase 프로젝트 활성화
1. Supabase 대시보드(https://app.supabase.com)에 접속
2. 프로젝트 선택
3. 프로젝트가 'Paused' 상태인 경우 'Restore' 버튼 클릭
4. 프로젝트가 활성화될 때까지 1-2분 대기
5. 마이그레이션 재실행

#### 방법 2: 실행 중인 프로세스 종료 후 재시도
```bash
# 모든 Node.js 프로세스 종료 (Windows)
taskkill /F /IM node.exe

# 또는 특정 포트 사용 프로세스 종료
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 마이그레이션 재실행
cd apps/api
pnpm prisma migrate dev --name add_persona_gender_and_chatroom_title
```

#### 방법 3: DIRECT_URL 확인
`apps/api/.env` 파일에서 `DIRECT_URL` 설정 확인:
```env
# Transaction pooler (Port 6543) - 일반 쿼리용
DATABASE_URL=postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection (Port 5432) - 마이그레이션용
DIRECT_URL=postgresql://...@...pooler.supabase.com:5432/postgres
```

### 예방 방법
- Supabase 프로젝트를 유료 플랜으로 업그레이드하여 자동 일시중지 방지
- 정기적으로 데이터베이스에 쿼리를 보내 활성 상태 유지
- 마이그레이션 전에 `prisma db pull`로 연결 확인

---

## 2. Prisma Client 재생성 파일 잠금 에러

### 이슈 내용
```
Error: EPERM: operation not permitted, rename
'C:\mini-whif\node_modules\.pnpm\@prisma+client@5.22.0_prisma@5.22.0\node_modules\.prisma\client\query_engine-windows.dll.node.tmp21492'
-> 'C:\mini-whif\node_modules\.pnpm\@prisma+client@5.22.0_prisma@5.22.0\node_modules\.prisma\client\query_engine-windows.dll.node'
```

Prisma Client 재생성 시 Windows에서 파일 이름 변경 권한 오류가 발생했습니다.

### 원인
1. **실행 중인 프로세스**: API 서버나 개발 서버가 실행 중이어서 Prisma query engine DLL 파일을 사용 중
2. **파일 잠금**: Windows에서 실행 중인 프로세스가 파일을 잠그면 다른 프로세스가 수정할 수 없음
3. **백그라운드 watch 모드**: tsx watch나 nodemon이 파일을 감시하며 잠금

### 해결 방법

#### 방법 1: 모든 Node 프로세스 종료 (권장)
```bash
# Windows
taskkill /F /IM node.exe

# macOS/Linux
pkill node

# Prisma Client 재생성
cd apps/api
pnpm prisma generate
```

#### 방법 2: 특정 포트 프로세스만 종료
```bash
# 포트 3000 사용 프로세스 찾기
netstat -ano | findstr :3000

# PID로 종료
taskkill /PID <PID> /F

# Prisma Client 재생성
pnpm prisma generate
```

#### 방법 3: node_modules 정리 (최후의 수단)
```bash
# 모든 프로세스 종료 후
rm -rf node_modules/.pnpm/@prisma
pnpm install
```

### 예방 방법
- 스키마 변경 전 개발 서버 중지
- 마이그레이션 스크립트에 서버 중지/재시작 로직 추가
- Docker 환경 사용 시 volume mount 최소화

---

## 3. TypeScript 타입 에러 (스키마 업데이트 후)

### 이슈 내용
```typescript
src/rpc/chatroom.handler.ts(70,23): error TS2339: Property 'title' does not exist on type '{ ... }'
src/rpc/persona.handler.ts(28,19): error TS2339: Property 'gender' does not exist on type '{ ... }'
```

Prisma 스키마에 새 필드를 추가했지만, 마이그레이션 전이라 Prisma Client가 업데이트되지 않아 TypeScript 타입 에러가 발생했습니다.

### 원인
1. **Prisma 스키마 수정**: `schema.prisma`에 `title`, `gender`, `sourceCharacterId` 필드 추가
2. **마이그레이션 미실행**: 데이터베이스 연결 문제로 마이그레이션이 실행되지 않음
3. **Prisma Client 미업데이트**: 마이그레이션 없이는 Prisma Client가 새 타입을 인식하지 못함

### 해결 방법

#### 단계별 해결
```bash
# 1. 스키마 수정 완료 확인
cat apps/api/prisma/schema.prisma

# 2. 마이그레이션 실행 (데이터베이스 업데이트)
cd apps/api
pnpm prisma migrate dev --name add_persona_gender_and_chatroom_title

# 3. Prisma Client 자동 재생성 확인
# (migrate dev 명령이 자동으로 실행)

# 4. TypeScript 타입 체크
pnpm tsc --noEmit

# 5. 서버 재시작
pnpm dev
```

#### 수동 Prisma Client 재생성
```bash
# 마이그레이션 없이 타입만 업데이트하려면 (권장하지 않음)
cd apps/api
pnpm prisma generate
```

### 예방 방법
- 스키마 수정과 마이그레이션을 항상 함께 실행
- CI/CD 파이프라인에 타입 체크 단계 추가
- Pre-commit hook에 `prisma generate` 및 타입 체크 포함

---

## 4. 빌드 권한 에러 (EPERM)

### 이슈 내용
```
uncaughtException [Error: EPERM: operation not permitted, open 'C:\mini-whif\apps\web\.next\trace']
```

Next.js 빌드 시 `.next/trace` 파일 접근 권한 오류가 발생했습니다.

### 원인
1. **이전 빌드 프로세스**: 이전 빌드나 개발 서버가 완전히 종료되지 않아 파일 잠금
2. **Windows 파일 시스템**: Windows의 파일 잠금 정책이 엄격함
3. **바이러스 백신**: 일부 안티바이러스가 `.next` 폴더를 스캔하며 파일 잠금

### 해결 방법

#### 방법 1: .next 폴더 삭제 후 재빌드
```bash
# 모든 Next.js 프로세스 종료
taskkill /F /IM node.exe

# .next 폴더 삭제
cd apps/web
rm -rf .next

# 재빌드
pnpm build
```

#### 방법 2: 개발 모드 사용
```bash
# 빌드 대신 개발 모드로 실행
pnpm dev
```

#### 방법 3: 관리자 권한으로 실행
```bash
# PowerShell을 관리자 권한으로 실행 후
cd C:\mini-whif
pnpm build
```

### 예방 방법
- 빌드 전 개발 서버 완전히 종료
- `.next` 폴더를 안티바이러스 예외 목록에 추가
- WSL2 환경 사용 고려

---

## 추가 팁

### 개발 워크플로우 권장사항

1. **스키마 변경 시**:
   ```bash
   # 1. 서버 중지
   # 2. 스키마 수정
   # 3. 마이그레이션
   pnpm db:migrate
   # 4. Proto 파일 업데이트 (필요시)
   pnpm proto:gen
   # 5. 서버 재시작
   ```

2. **깨끗한 상태로 시작**:
   ```bash
   # 모든 프로세스 종료
   taskkill /F /IM node.exe

   # 의존성 재설치
   pnpm install

   # Prisma Client 재생성
   cd apps/api && pnpm prisma generate

   # 개발 서버 시작
   cd ../.. && pnpm dev
   ```

3. **문제 해결 체크리스트**:
   - [ ] Supabase 프로젝트가 활성화되어 있는가?
   - [ ] 모든 Node 프로세스가 종료되었는가?
   - [ ] DATABASE_URL과 DIRECT_URL이 올바른가?
   - [ ] Prisma Client가 최신 상태인가?
   - [ ] Proto 파일이 생성되었는가?
   - [ ] TypeScript 에러가 없는가?

### 유용한 명령어

```bash
# Prisma 관련
pnpm prisma studio              # 데이터베이스 GUI
pnpm prisma db pull             # 데이터베이스 스키마 가져오기
pnpm prisma db push             # 스키마 변경사항 즉시 반영 (개발용)
pnpm prisma migrate reset       # 마이그레이션 초기화 및 시드 실행

# Proto 관련
pnpm proto:gen                  # Protocol Buffers 코드 생성
pnpm --filter proto generate    # proto 패키지만 재생성

# 개발 서버
pnpm dev                        # 모든 서비스 병렬 실행
pnpm --filter web dev           # 프론트엔드만 실행
pnpm --filter api dev           # API 서버만 실행

# 타입 체크
pnpm --filter web tsc --noEmit
pnpm --filter api tsc --noEmit
```

---

## 관련 문서

- [Prisma Migrate 공식 문서](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Supabase 연결 가이드](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Protocol Buffers TypeScript](https://github.com/bufbuild/protobuf-es)
- [프로젝트 README](./README.md)
- [개발 가이드](./GETTING_STARTED.md)
