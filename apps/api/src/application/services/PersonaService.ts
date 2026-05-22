import {
  IPersonaRepository,
  FindPersonasParams,
  CreatePersonaParams,
} from '../../domain/repositories/IPersonaRepository.js';
import { UserPersona } from '@prisma/client';

/**
 * Persona Service
 *
 * 페르소나 관련 비즈니스 로직을 담당합니다.
 * Repository 레이어를 활용한 얇은 Service 레이어
 */
export class PersonaService {
  constructor(private personaRepo: IPersonaRepository) {}

  /**
   * 페르소나 ID로 조회
   */
  async getPersona(id: string, userId: string): Promise<UserPersona | null> {
    return await this.personaRepo.findById(id, userId);
  }

  /**
   * 페르소나 목록 조회
   */
  async listPersonas(params: FindPersonasParams): Promise<{
    personas: UserPersona[];
    total: number;
    hasMore: boolean;
  }> {
    const { personas, total } = await this.personaRepo.findMany(params);

    const limit = params.limit || 20;
    const offset = params.offset || 0;
    const hasMore = offset + personas.length < total;

    return { personas, total, hasMore };
  }

  /**
   * 기본 페르소나 조회
   */
  async getDefaultPersona(userId: string): Promise<UserPersona | null> {
    return await this.personaRepo.findDefault(userId);
  }

  /**
   * 페르소나 생성
   */
  async createPersona(params: CreatePersonaParams): Promise<UserPersona> {
    return await this.personaRepo.create(params);
  }

  /**
   * 페르소나 업데이트
   */
  async updatePersona(
    id: string,
    userId: string,
    data: Partial<CreatePersonaParams>
  ): Promise<UserPersona> {
    return await this.personaRepo.update(id, userId, data);
  }

  /**
   * 페르소나 삭제
   */
  async deletePersona(id: string, userId: string): Promise<void> {
    await this.personaRepo.delete(id, userId);
  }

  /**
   * 기본 페르소나 설정
   */
  async setDefaultPersona(id: string, userId: string): Promise<UserPersona> {
    return await this.personaRepo.setDefault(id, userId);
  }
}
