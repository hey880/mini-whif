# 근본 원인 분석: 반복적 버그 수정 실패

## 문제 요약

동일한 버그에 대해 3번의 수정이 필요했음:
1. `93f43b5` - Universe 상세 페이지 React Query 안정성 개선
2. `bf2bb3a` - 클라이언트 사이드 네비게이션 시 데이터 로딩 타이밍 개선
3. `3f7efd7` - Universe 및 Character 페이지 null 안전성 개선 (최종)

## 버그 내용

### 증상
- 캐릭터 상세 → Universe 상세 이동 시 "작품을 찾을 수 없습니다" 표시
- 새로고침하면 정상 작동
- 뒤로가기 시 `Cannot read properties of undefined (reading 'length')` 에러 발생

### 근본 원인
**선택적 배열 속성(tags, keywords)에 대한 null/undefined 체크 누락**

```typescript
// 잘못된 코드
{universeData.tags.length > 0 && ...}
{character.keywords.length > 0 && ...}

// 올바른 코드
{universeData.tags && universeData.tags.length > 0 && ...}
{character.keywords && character.keywords.length > 0 && ...}
```

## 왜 3번의 수정이 필요했나?

### 1차 수정 (93f43b5)의 한계
**수정한 것:**
- Universe 상세 페이지의 `universeData.tags` null 체크 추가
- React Query에 `enabled: !!universeId` 추가

**놓친 것:**
- 캐릭터 상세 페이지에서 Universe 데이터를 표시하는 부분 (448번 줄)
- 같은 패턴의 버그가 있는 다른 파일들

**실패 원인:**
- 파일 하나만 수정하고 전체 코드베이스를 검색하지 않음
- 같은 데이터 구조를 사용하는 다른 컴포넌트를 확인하지 않음

### 2차 수정 (bf2bb3a)의 한계
**수정한 것:**
- Universe 상세 페이지의 로딩 로직 개선 시도
- 캐릭터 상세 페이지의 `char.keywords` null 체크 추가

**놓친 것:**
- 캐릭터 상세 페이지의 `universeData.tags` (448번 줄) ← **핵심 누락**
- 로딩 로직을 잘못된 방식으로 수정 (중첩 if문으로 복잡도 증가)

**실패 원인:**
- 503번 줄의 `char.keywords`는 수정했지만, 448번 줄의 `universeData.tags`는 놓침
- 한 파일 내에서도 같은 패턴을 모두 찾지 못함
- 수정 후 전체 파일을 다시 검토하지 않음

### 3차 수정 (3f7efd7) - 최종
**수정한 것:**
- 캐릭터 상세 페이지의 `universeData.tags` null 체크 추가 (448번 줄)
- Universe 상세 페이지의 로딩 로직을 올바르게 분리

**여전히 남아있는 문제:**
다음 파일들에도 같은 패턴의 버그가 존재함:

```
apps/web/src/app/page.tsx:305
  {universe.tags.length > 0 && (

apps/web/src/app/search/page.tsx:198
  {universe.tags.length > 0 && (

apps/web/src/app/mypage/my-universes/page.tsx:361
  {universe.tags.length > 0 && (

apps/web/src/app/characters/[id]/page.tsx:298
  {character.keywords.length > 0 && (
```

## 실패 원인 분석

### 1. 불충분한 코드베이스 검색
- 문제가 발견된 파일만 수정
- 같은 패턴을 사용하는 다른 파일들을 검색하지 않음
- Grep이나 전역 검색을 활용하지 않음

### 2. 불완전한 테스트 시나리오
- Universe → Character 이동만 테스트
- **Character → Universe → 뒤로가기** 시나리오를 놓침
- 사용자가 보고한 정확한 재현 경로를 따르지 않음

### 3. 데이터 구조 이해 부족
- `tags`와 `keywords`가 선택적 배열 속성임을 인지하지 못함
- API 응답이나 Proto 정의를 확인하지 않음
- 같은 데이터가 어디에서 사용되는지 파악하지 않음

### 4. React Query 라이프사이클 오해
- 클라이언트 사이드 네비게이션 시 쿼리 상태 변화를 정확히 이해하지 못함
- `isLoading`과 `isFetching`의 차이를 고려하지 않음
- 캐시된 데이터와 새 데이터의 전환 시점을 예측하지 못함

### 5. 단편적 수정 접근
- "이 에러만 고치자"는 사고방식
- "이 패턴의 모든 문제를 해결하자"는 접근이 없었음
- 수정 후 영향 범위를 재평가하지 않음

## 올바른 문제 해결 절차

### 1단계: 문제의 본질 파악
```
❌ "Universe 페이지가 안 나온다"
✅ "선택적 배열 속성에 대한 null 체크가 없다"
```

### 2단계: 전체 영향 범위 조사
```bash
# 같은 패턴을 모든 파일에서 검색
grep -r "\.tags\.length" apps/web/src
grep -r "\.keywords\.length" apps/web/src

# 또는 Task 도구로 explore agent 사용
Task(subagent_type="Explore", prompt="Find all usages of .tags.length and .keywords.length")
```

### 3단계: 데이터 구조 확인
```typescript
// Proto 정의 확인
packages/proto/proto/universe.proto
packages/proto/proto/character.proto

// API 응답 확인
apps/api/src/rpc/universe.handler.ts
```

### 4단계: 모든 발생 위치 일괄 수정
- 발견된 모든 파일을 한 번에 수정
- 누락을 방지하기 위해 체크리스트 작성

### 5단계: 엣지 케이스 테스트
- 정상 케이스
- 빈 배열 케이스
- undefined/null 케이스
- 클라이언트 사이드 네비게이션
- 새로고침
- 뒤로가기/앞으로가기

### 6단계: 예방 코드 작성
```typescript
// 유틸리티 함수로 추상화
function hasItems<T>(arr: T[] | undefined | null): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}

// 사용
{hasItems(universeData.tags) && (
  ...
)}
```

## 즉시 적용 가능한 개선 사항

### 1. 남은 버그 일괄 수정
위에서 발견된 4개 파일의 버그를 즉시 수정

### 2. TypeScript 타입 강화
```typescript
// Proto 정의에서 optional 명시
message Universe {
  repeated string tags = 1;  // 이미 배열인데 undefined 가능?
}

// 또는 Prisma 스키마 확인
model Universe {
  tags String[]  // nullable인지 확인
}
```

### 3. Lint 규칙 추가
```javascript
// ESLint custom rule
{
  "rules": {
    "no-unsafe-member-expression": "error"  // TypeScript strict mode
  }
}
```

### 4. 통합 테스트 추가
```typescript
describe('Navigation flows', () => {
  it('should handle Character -> Universe -> Back navigation', () => {
    // 사용자 보고 시나리오를 테스트 코드로 작성
  });
});
```

## 교훈

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

## 다음 액션 아이템

- [ ] 남은 4개 파일의 버그 수정
- [ ] 배열 속성 안전 체크 유틸리티 함수 작성
- [ ] Proto/Prisma 스키마에서 optional 필드 명확히 문서화
- [ ] 네비게이션 흐름 E2E 테스트 추가
- [ ] 코드 리뷰 체크리스트에 "배열 null 체크" 항목 추가
