import { UserPersona } from '@prisma/client';

/**
 * 페르소나 조회 파라미터
 */
export interface FindPersonasParams {
  userId: string;
  limit?: number;
  offset?: number;
  /** true이면 캐릭터 기반 페르소나(sourceCharacterId != null)를 제외 */
  excludeCharacterBased?: boolean;
}

/**
 * 페르소나 생성/수정 파라미터
 */
export interface CreatePersonaParams {
  userId: string;
  name: string;
  /** 페르소나 설명 텍스트 */
  persona: string;
  gender?: string;
  sourceCharacterId?: string;
  isDefault?: boolean;
}

/**
 * UserPersona Repository 인터페이스
 */
export interface IPersonaRepository {
  /**
   * ID로 페르소나 조회
   * @param id 페르소나 ID
   * @param userId 사용자 ID (권한 검증용)
   * @returns UserPersona 또는 null
   */
  findById(id: string, userId: string): Promise<UserPersona | null>;

  /**
   * 사용자의 페르소나 목록 조회
   * @param params 조회 파라미터
   * @returns 페르소나 목록 및 전체 개수
   */
  findMany(params: FindPersonasParams): Promise<{
    personas: UserPersona[];
    total: number;
  }>;

  /**
   * 기본 페르소나 조회
   * @param userId 사용자 ID
   * @returns 기본 UserPersona 또는 null
   */
  findDefault(userId: string): Promise<UserPersona | null>;

  /**
   * 페르소나 생성
   * @param params 생성 파라미터
   * @returns 생성된 UserPersona
   */
  create(params: CreatePersonaParams): Promise<UserPersona>;

  /**
   * 페르소나 업데이트
   * @param id 페르소나 ID
   * @param userId 사용자 ID (권한 검증용)
   * @param data 업데이트할 데이터
   * @returns 업데이트된 UserPersona
   */
  update(
    id: string,
    userId: string,
    data: Partial<Omit<CreatePersonaParams, 'userId'>>
  ): Promise<UserPersona>;

  /**
   * 페르소나 삭제
   * @param id 페르소나 ID
   * @param userId 사용자 ID (권한 검증용)
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * 기본 페르소나 설정
   *
   * 기존 기본 페르소나를 해제하고 새 페르소나를 기본으로 설정
   * @param id 페르소나 ID
   * @param userId 사용자 ID (권한 검증용)
   * @returns 업데이트된 UserPersona
   */
  setDefault(id: string, userId: string): Promise<UserPersona>;
}
