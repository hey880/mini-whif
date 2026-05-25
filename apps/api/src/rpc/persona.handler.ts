import type { ServiceImpl, HandlerContext } from '@connectrpc/connect';
import { Code, ConnectError } from '@connectrpc/connect';
import { PersonaService } from '@persona-chat/proto/gen/ts/persona_connect.js';
import { UserPersona } from '@prisma/client';
import { PersonaService as PersonaAppService } from '../application/services/PersonaService.js';
import { userContextKey } from '../context.js';

function mapPersonaToProto(p: UserPersona) {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    persona: p.persona,
    isDefault: p.isDefault,
    gender: p.gender || undefined,
    sourceCharacterId: p.sourceCharacterId || undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toNotFound(error: unknown): never {
  if (error instanceof Error) {
    throw new ConnectError(error.message, Code.NotFound);
  }
  throw error;
}

export function createPersonaHandler(
  personaService: PersonaAppService
): ServiceImpl<typeof PersonaService> {
  return {
    async listPersonas(_req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

      const { personas } = await personaService.listPersonas({
        userId: user.id,
        excludeCharacterBased: true,
      });

      return { personas: personas.map(mapPersonaToProto) };
    },

    async getPersona(req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

      const persona = await personaService.getPersona(req.id, user.id);
      if (!persona) throw new ConnectError('Persona not found', Code.NotFound);

      return { persona: mapPersonaToProto(persona) };
    },

    async createPersona(req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

      const persona = await personaService.createPersona({
        userId: user.id,
        name: req.name,
        persona: req.persona,
        gender: req.gender || undefined,
        sourceCharacterId: req.sourceCharacterId || undefined,
        isDefault: req.isDefault || false,
      });

      return { persona: mapPersonaToProto(persona) };
    },

    async updatePersona(req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

      const updateData: any = {};
      if (req.name !== undefined) updateData.name = req.name;
      if (req.persona !== undefined) updateData.persona = req.persona;
      if (req.gender !== undefined) updateData.gender = req.gender;

      const persona = await personaService
        .updatePersona(req.id, user.id, updateData)
        .catch(toNotFound);

      return { persona: mapPersonaToProto(persona) };
    },

    async deletePersona(req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

      await personaService.deletePersona(req.id, user.id).catch(toNotFound);

      return { success: true };
    },

    async setDefaultPersona(req, context: HandlerContext) {
      const user = context.values.get(userContextKey);
      if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);

      const persona = await personaService
        .setDefaultPersona(req.id, user.id)
        .catch(toNotFound);

      return { persona: mapPersonaToProto(persona) };
    },
  };
}
