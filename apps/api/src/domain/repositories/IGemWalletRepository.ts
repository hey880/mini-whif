import { GemWallet } from '@prisma/client';

/**
 * Gem 잔액 정보
 */
export interface GemBalance {
  totalGems: number;
  paidGemAmount: number;
  freeDailyGemAmount: number;
  freePromoGemAmount: number;
  freeDailyGemLastRefillDate: Date | null;
}

/**
 * Gem 차감 타입
 */
export type GemType = 'paid' | 'freeDaily' | 'freePromo';

/**
 * Gem 차감 결과
 */
export interface DeductGemsResult {
  success: boolean;
  remainingGems: number;
  deductedFrom: {
    freeDaily: number;
    freePromo: number;
    paid: number;
  };
}

/**
 * GemWallet Repository 인터페이스
 *
 * Gem 경제 시스템을 담당합니다.
 * 차감 우선순위: 일일 무료 → 프로모션 무료 → 유료
 */
export interface IGemWalletRepository {
  /**
   * 사용자 지갑 조회
   * @param userId 사용자 ID
   * @returns GemWallet 또는 null
   */
  findByUserId(userId: string): Promise<GemWallet | null>;

  /**
   * 지갑 잔액 조회 (총합)
   * @param userId 사용자 ID
   * @returns 잔액 정보
   */
  getBalance(userId: string): Promise<GemBalance>;

  /**
   * Gem 차감
   *
   * 우선순위에 따라 차감:
   * 1. Free Daily
   * 2. Free Promo
   * 3. Paid
   *
   * @param userId 사용자 ID
   * @param amount 차감할 양
   * @returns 차감 결과
   */
  deductGems(userId: string, amount: number): Promise<DeductGemsResult>;

  /**
   * Gem 추가
   * @param userId 사용자 ID
   * @param amount 추가할 양
   * @param type Gem 타입
   * @returns 업데이트된 GemWallet
   */
  addGems(userId: string, amount: number, type: GemType): Promise<GemWallet>;

  /**
   * 일일 무료 Gem 재충전
   *
   * 매일 자정에 200 Gem으로 재충전
   * @param userId 사용자 ID
   * @returns 업데이트된 GemWallet
   */
  refillDailyGems(userId: string): Promise<GemWallet>;

  /**
   * 잔액 확인 (충분한지)
   * @param userId 사용자 ID
   * @param requiredAmount 필요한 양
   * @returns true if sufficient, false otherwise
   */
  hasSufficientBalance(userId: string, requiredAmount: number): Promise<boolean>;
}
