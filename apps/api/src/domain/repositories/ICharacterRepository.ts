import { Character, Universe, Profile } from '@prisma/client';

/**
 * 캐릭터 조회 파라미터
 */
export interface FindCharactersParams {
  keyword?: string;
  universeId?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  creatorId?: string;
  limit?: number;
  offset?: number;
}

/**
 * 캐릭터 생성 파라미터
 */
export interface CreateCharacterParams {
  name: string;
  creatorId: string;
  tagline?: string;
  description?: string;
  greeting?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  visibility: 'public' | 'private' | 'unlisted';
  isNsfw: boolean;
  universeId?: string;
  keywords?: string[];
  data: any;
  lorebook?: any;
}

/**
 * 캐릭터 응답 타입 (관계 포함, 최적화)
 */
export interface CharacterWithRelations extends Omit<Character, 'data' | 'lorebook'> {
  universe?: Partial<Universe>;
  creator?: Partial<Profile>;
  _count?: {
    chatRooms: number;
  };
}

/**
 * 캐릭터 상세 타입 (data, lorebook 포함)
 */
export interface CharacterDetail extends Character {
  universe?: Partial<Universe>;
  creator?: Partial<Profile>;
}

/**
 * Character Repository 인터페이스
 */
export interface ICharacterRepository {
  /**
   * ID로 캐릭터 조회 (상세 정보 포함)
   * @param id 캐릭터 ID
   * @returns Character 또는 null
   */
  findById(id: string): Promise<CharacterDetail | null>;

  /**
   * 여러 캐릭터 조회 (리스트용, 최적화)
   *
   * Phase 1 최적화: data, lorebook 필드 제외
   * @param params 조회 파라미터
   * @returns 캐릭터 목록 및 전체 개수
   */
  findMany(params: FindCharactersParams): Promise<{
    characters: CharacterWithRelations[];
    total: number;
  }>;

  /**
   * 캐릭터 생성
   * @param params 생성 파라미터
   * @returns 생성된 Character
   */
  create(params: CreateCharacterParams): Promise<Character>;

  /**
   * 캐릭터 업데이트
   * @param id 캐릭터 ID
   * @param creatorId 제작자 ID (권한 검증용)
   * @param data 업데이트할 데이터
   * @returns 업데이트된 Character
   */
  update(
    id: string,
    creatorId: string,
    data: Partial<CreateCharacterParams>
  ): Promise<Character>;

  /**
   * 캐릭터 삭제
   * @param id 캐릭터 ID
   * @param creatorId 제작자 ID (권한 검증용)
   */
  delete(id: string, creatorId: string): Promise<void>;
}
