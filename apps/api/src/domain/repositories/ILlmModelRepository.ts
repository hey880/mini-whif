import { LlmModel } from '@prisma/client';

/**
 * LLM 모델 조회 파라미터
 */
export interface FindLlmModelsParams {
  isActive?: boolean;
  provider?: string;
  limit?: number;
  offset?: number;
}

/**
 * LLM 모델 생성 파라미터
 */
export interface CreateLlmModelParams {
  slug: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  gemCostPerMessage: number;
  isActive: boolean;
}

/**
 * LlmModel Repository 인터페이스
 */
export interface ILlmModelRepository {
  /**
   * Slug로 모델 조회
   * @param slug 모델 slug
   * @returns LlmModel 또는 null
   */
  findBySlug(slug: string): Promise<LlmModel | null>;

  /**
   * ID로 모델 조회
   * @param id 모델 ID
   * @returns LlmModel 또는 null
   */
  findById(id: string): Promise<LlmModel | null>;

  /**
   * 여러 모델 조회
   * @param params 조회 파라미터
   * @returns 모델 목록 및 전체 개수
   */
  findMany(params: FindLlmModelsParams): Promise<{
    models: LlmModel[];
    total: number;
  }>;

  /**
   * 기본 모델 조회 (가장 저렴한 활성 모델)
   * @returns LlmModel 또는 null
   */
  findDefaultModel(): Promise<LlmModel | null>;

  /**
   * 모델 생성
   * @param params 생성 파라미터
   * @returns 생성된 LlmModel
   */
  create(params: CreateLlmModelParams): Promise<LlmModel>;

  /**
   * 모델 업데이트
   * @param id 모델 ID
   * @param data 업데이트할 데이터
   * @returns 업데이트된 LlmModel
   */
  update(id: string, data: Partial<CreateLlmModelParams>): Promise<LlmModel>;

  /**
   * 모델 삭제
   * @param id 모델 ID
   */
  delete(id: string): Promise<void>;
}
