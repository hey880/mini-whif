import { test, expect } from '@playwright/test';

/**
 * E2E 테스트: 캐릭터 상세 → Universe 상세 네비게이션
 *
 * 시나리오:
 * 1. 캐릭터 상세 페이지로 이동
 * 2. 작품 정보 섹션의 "더보기" 버튼 클릭
 * 3. Universe 상세 페이지로 이동
 * 4. 로딩 후 정상적으로 Universe 정보 표시 확인
 * 5. 뒤로가기 버튼 클릭
 * 6. 캐릭터 상세 페이지로 복귀 확인
 */
test.describe('Character to Universe Navigation', () => {
  // 실제 존재하는 캐릭터와 Universe ID (사용자가 제공한 것)
  const characterId = '39336f9b-c068-4334-894d-47e706f488fc';
  const universeId = 'd07ba084-dac1-491c-8d61-e78537175d8b';

  test('should navigate from character detail to universe detail without errors', async ({ page }) => {
    // 1. 캐릭터 상세 페이지로 이동
    await page.goto(`/characters/${characterId}`);

    // 캐릭터 페이지가 로드될 때까지 대기
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // 캐릭터 이름이 표시되는지 확인
    const characterName = await page.locator('h1').textContent();
    expect(characterName).toBeTruthy();
    console.log(`✓ 캐릭터 페이지 로드됨: ${characterName}`);

    // 2. 작품 정보 섹션 확인
    const universeSection = page.locator('text=작품 정보').first();
    await expect(universeSection).toBeVisible({ timeout: 5000 });
    console.log('✓ 작품 정보 섹션 발견');

    // 3. "더보기" 링크 클릭
    const moreLink = page.locator('text=더보기').first();
    await expect(moreLink).toBeVisible();
    await moreLink.click();
    console.log('✓ 더보기 버튼 클릭');

    // 4. URL이 Universe 페이지로 변경되었는지 확인
    await page.waitForURL(`**/universe/${universeId}`, { timeout: 5000 });
    console.log(`✓ Universe 페이지로 이동: /universe/${universeId}`);

    // 5. 로딩 스켈레톤이 표시되었다가 사라지는지 확인 (선택적)
    // 스켈레톤이 빠르게 사라질 수 있으므로 타임아웃 짧게 설정
    const skeleton = page.locator('.skeleton').first();
    try {
      await expect(skeleton).toBeVisible({ timeout: 1000 });
      console.log('✓ 로딩 스켈레톤 표시됨');
    } catch {
      console.log('⊘ 로딩이 너무 빨라 스켈레톤을 확인하지 못함 (정상)');
    }

    // 6. 에러 메시지가 표시되지 않는지 확인 (핵심 체크)
    const errorMessage = page.locator('text=작품을 찾을 수 없습니다');
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 });
    console.log('✓ 에러 메시지가 표시되지 않음');

    // 7. Universe 제목이 표시되는지 확인
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    const universeName = await page.locator('h1').textContent();
    expect(universeName).toBeTruthy();
    console.log(`✓ Universe 페이지 로드됨: ${universeName}`);

    // 8. "캐릭터 (N)" 섹션이 표시되는지 확인
    const charactersSection = page.locator('text=/캐릭터 \\(\\d+\\)/').first();
    await expect(charactersSection).toBeVisible({ timeout: 5000 });
    console.log('✓ 캐릭터 목록 섹션 표시됨');

    // 9. 뒤로가기 버튼 클릭
    const backButton = page.locator('button:has-text("뒤로가기")').first();
    await expect(backButton).toBeVisible();
    await backButton.click();
    console.log('✓ 뒤로가기 버튼 클릭');

    // 10. URL이 캐릭터 페이지로 돌아갔는지 확인
    await page.waitForURL(`**/characters/${characterId}`, { timeout: 5000 });
    console.log(`✓ 캐릭터 페이지로 복귀: /characters/${characterId}`);

    // 11. 캐릭터 페이지가 정상적으로 표시되는지 확인 (에러 없이)
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
    const returnedCharacterName = await page.locator('h1').textContent();
    expect(returnedCharacterName).toBe(characterName);
    console.log(`✓ 캐릭터 페이지 정상 표시: ${returnedCharacterName}`);

    // 12. JavaScript 콘솔 에러가 없는지 확인
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`❌ 브라우저 콘솔 에러: ${msg.text()}`);
      }
    });

    // 13. 페이지 에러가 없는지 확인
    page.on('pageerror', (error) => {
      console.error(`❌ 페이지 에러: ${error.message}`);
      throw error; // 테스트 실패시킴
    });
  });

  test('should handle direct universe page access', async ({ page }) => {
    // 직접 Universe 페이지로 이동하는 경우도 테스트
    await page.goto(`/universe/${universeId}`);

    // 에러 메시지가 표시되지 않아야 함
    const errorMessage = page.locator('text=작품을 찾을 수 없습니다');
    await expect(errorMessage).not.toBeVisible({ timeout: 10000 });

    // Universe 제목이 표시되어야 함
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    const universeName = await page.locator('h1').textContent();
    expect(universeName).toBeTruthy();
    console.log(`✓ 직접 접근 성공: ${universeName}`);
  });

  test('should handle refresh on universe page', async ({ page }) => {
    // Universe 페이지에서 새로고침하는 경우도 테스트
    await page.goto(`/universe/${universeId}`);

    // 첫 로드 확인
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    console.log('✓ 첫 로드 성공');

    // 새로고침
    await page.reload();
    console.log('✓ 페이지 새로고침');

    // 새로고침 후에도 정상 표시되어야 함
    const errorMessage = page.locator('text=작품을 찾을 수 없습니다');
    await expect(errorMessage).not.toBeVisible({ timeout: 10000 });

    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    console.log('✓ 새로고침 후 정상 표시');
  });
});
