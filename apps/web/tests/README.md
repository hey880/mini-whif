# E2E 테스트

Playwright를 사용한 End-to-End 테스트

## 설치

```bash
cd apps/web
pnpm install
npx playwright install  # 브라우저 설치 (첫 실행 시에만)
```

## 테스트 실행

### 기본 실행 (헤드리스 모드)
```bash
pnpm test:e2e
```

### UI 모드 (인터랙티브)
```bash
pnpm test:e2e:ui
```

### 브라우저 표시 (헤디드 모드)
```bash
pnpm test:e2e:headed
```

### 디버그 모드
```bash
pnpm test:e2e:debug
```

## 테스트 시나리오

### Character to Universe Navigation
- **파일**: `e2e/character-to-universe-navigation.spec.ts`
- **목적**: 캐릭터 상세 → Universe 상세 네비게이션 시 발생하던 버그 재현 및 회귀 방지
- **시나리오**:
  1. 캐릭터 상세 페이지 접근
  2. "더보기" 버튼으로 Universe 페이지 이동
  3. 로딩 후 정상 표시 확인
  4. 뒤로가기로 캐릭터 페이지 복귀
  5. 에러 없이 정상 표시 확인

## CI/CD 통합

GitHub Actions나 다른 CI 환경에서 실행 시:

```bash
CI=true pnpm test:e2e
```

## 테스트 작성 가이드

### 새 테스트 추가

1. `tests/e2e/` 디렉토리에 `*.spec.ts` 파일 생성
2. Playwright API를 사용하여 테스트 작성:
   ```typescript
   import { test, expect } from '@playwright/test';

   test('should do something', async ({ page }) => {
     await page.goto('/');
     await expect(page.locator('h1')).toBeVisible();
   });
   ```

### 베스트 프랙티스

- **Selector 우선순위**: text content > role > test-id > CSS selector
- **대기 전략**: `expect().toBeVisible()` 사용 (자동 재시도)
- **에러 핸들링**: `page.on('pageerror')` 리스너 추가
- **스크린샷**: 자동으로 실패 시 캡처됨
- **병렬 실행**: 기본적으로 병렬 실행 가능하도록 격리된 테스트 작성

## 문제 해결

### 브라우저가 설치되지 않았다는 에러
```bash
npx playwright install
```

### 타임아웃 에러
- `playwright.config.ts`에서 `timeout` 설정 조정
- 테스트에서 `{ timeout: 10000 }` 옵션 사용

### 포트 충돌
- 다른 터미널에서 dev 서버가 실행 중인지 확인
- `webServer.reuseExistingServer: true` 설정으로 기존 서버 재사용

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
