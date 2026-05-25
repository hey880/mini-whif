import {
  ICharacterRepository,
  FindCharactersParams,
  CreateCharacterParams,
  CharacterWithRelations,
  CharacterDetail,
  CharacterSummary,
} from '../../domain/repositories/ICharacterRepository.js';

/**
 * Character Service
 *
 * 캐릭터 관련 비즈니스 로직을 담당합니다.
 * Repository 레이어를 활용한 얇은 Service 레이어
 */
export class CharacterService {
  constructor(private characterRepo: ICharacterRepository) {}

  /**
   * 캐릭터 ID로 조회
   */
  async getCharacter(id: string): Promise<CharacterDetail | null> {
    return await this.characterRepo.findById(id);
  }

  /**
   * 캐릭터 목록 조회 (키워드 검색, 페이지네이션)
   */
  async listCharacters(params: FindCharactersParams): Promise<{
    characters: CharacterWithRelations[];
    total: number;
    hasMore: boolean;
  }> {
    const { characters, total } = await this.characterRepo.findMany(params);

    const offset = params.offset || 0;
    const hasMore = offset + characters.length < total;

    return { characters, total, hasMore };
  }

  /**
   * 유니버스 내 공개 캐릭터 목록 조회
   */
  async listCharactersByUniverse(universeId: string): Promise<CharacterSummary[]> {
    return await this.characterRepo.listByUniverse(universeId);
  }

  /**
   * 캐릭터 생성
   */
  async createCharacter(params: CreateCharacterParams) {
    return await this.characterRepo.create(params);
  }

  /**
   * 캐릭터 업데이트
   */
  async updateCharacter(
    id: string,
    creatorId: string,
    data: Partial<CreateCharacterParams>
  ) {
    return await this.characterRepo.update(id, creatorId, data);
  }

  /**
   * 캐릭터 삭제
   */
  async deleteCharacter(id: string, creatorId: string): Promise<void> {
    await this.characterRepo.delete(id, creatorId);
  }
}
