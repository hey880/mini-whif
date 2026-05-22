import { Universe, Profile } from '@prisma/client';

/**
 * 세계관 조회 파라미터
 */
export interface FindUniversesParams {
  keyword?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  creatorId?: string;
  limit?: number;
  offset?: number;
}

/**
 * 세계관 생성 파라미터
 */
export interface CreateUniverseParams {
  name: string;
  creatorId: string;
  description?: string;
  imageUrl?: string;
  visibility: 'public' | 'private' | 'unlisted';
  genre?: string;
  tags?: string[];
  data: any;
  lorebook?: any;
}

/**
 * 세계관 응답 타입 (리스트용, 최적화)
 */
export interface UniverseWithRelations extends Omit<Universe, 'data' | 'lorebook'> {
  creator?: Partial<Profile>;
  _count?: {
    characters: number;
  };
}

/**
 * 세계관 상세 타입 (data, lorebook 포함)
 */
export interface UniverseDetail extends Universe {
  creator?: Partial<Profile>;
  _count?: {
    characters: number;
  };
}

/**
 * Universe Repository 인터페이스
 */
export interface IUniverseRepository {
  /**
   * ID로 세계관 조회 (상세 정보 포함)
   * @param id 세계관 ID
   * @returns Universe 또는 null
   */
  findById(id: string): Promise<UniverseDetail | null>;

  /**
   * 여러 세계관 조회 (리스트용, 최적화)
   *
   * Phase 1 최적화: data, lorebook 필드 제외
   * @param params 조회 파라미터
   * @returns 세계관 목록 및 전체 개수
   */
  findMany(params: FindUniversesParams): Promise<{
    universes: UniverseWithRelations[];
    total: number;
  }>;

  /**
   * 세계관 생성
   * @param params 생성 파라미터
   * @returns 생성된 Universe
   */
  create(params: CreateUniverseParams): Promise<Universe>;

  /**
   * 세계관 업데이트
   * @param id 세계관 ID
   * @param creatorId 제작자 ID (권한 검증용)
   * @param data 업데이트할 데이터
   * @returns 업데이트된 Universe
   */
  update(
    id: string,
    creatorId: string,
    data: Partial<CreateUniverseParams>
  ): Promise<Universe>;

  /**
   * 세계관 삭제
   * @param id 세계관 ID
   * @param creatorId 제작자 ID (권한 검증용)
   */
  delete(id: string, creatorId: string): Promise<void>;
}
