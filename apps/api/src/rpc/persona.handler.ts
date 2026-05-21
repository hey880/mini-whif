import type { ServiceImpl, HandlerContext } from '@connectrpc/connect';
import { Code, ConnectError } from '@connectrpc/connect';
import { PersonaService } from '@persona-chat/proto/gen/ts/persona_connect.js';
import { prisma } from '../config/prisma.js';
import { userContextKey } from '../context.js';

export const personaHandler: ServiceImpl<typeof PersonaService> = {
  async listPersonas(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // List personas for the authenticated user (exclude character-based personas)
    const personas = await prisma.userPersona.findMany({
      where: {
        userId: user.id,
        sourceCharacterId: null  // Only show user-created personas, not character-based ones
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      personas: personas.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        persona: p.persona,
        isDefault: p.isDefault,
        gender: p.gender || undefined,
        sourceCharacterId: p.sourceCharacterId || undefined,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  },

  async getPersona(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    const persona = await prisma.userPersona.findUnique({
      where: { id: req.id },
    });

    if (!persona) {
      throw new ConnectError('Persona not found', Code.NotFound);
    }

    // Verify ownership
    if (persona.userId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    return {
      persona: {
        id: persona.id,
        userId: persona.userId,
        name: persona.name,
        persona: persona.persona,
        isDefault: persona.isDefault,
        gender: persona.gender || undefined,
        sourceCharacterId: persona.sourceCharacterId || undefined,
        createdAt: persona.createdAt.toISOString(),
        updatedAt: persona.updatedAt.toISOString(),
      },
    };
  },

  async createPersona(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    const persona = await prisma.userPersona.create({
      data: {
        userId: user.id,
        name: req.name,
        persona: req.persona,
        gender: req.gender || undefined,
        sourceCharacterId: req.sourceCharacterId || undefined,
        isDefault: req.isDefault || false,
      },
    });

    // If this is marked as default, unset other defaults
    if (req.isDefault) {
      await prisma.userPersona.updateMany({
        where: {
          userId: user.id,
          id: { not: persona.id },
        },
        data: { isDefault: false },
      });
    }

    return {
      persona: {
        id: persona.id,
        userId: persona.userId,
        name: persona.name,
        persona: persona.persona,
        isDefault: persona.isDefault,
        gender: persona.gender || undefined,
        sourceCharacterId: persona.sourceCharacterId || undefined,
        createdAt: persona.createdAt.toISOString(),
        updatedAt: persona.updatedAt.toISOString(),
      },
    };
  },

  async updatePersona(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const existing = await prisma.userPersona.findUnique({
      where: { id: req.id },
    });

    if (!existing) {
      throw new ConnectError('Persona not found', Code.NotFound);
    }

    if (existing.userId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    // Build update data
    const updateData: any = {};
    if (req.name !== undefined) updateData.name = req.name;
    if (req.persona !== undefined) updateData.persona = req.persona;
    if (req.gender !== undefined) updateData.gender = req.gender;

    const persona = await prisma.userPersona.update({
      where: { id: req.id },
      data: updateData,
    });

    return {
      persona: {
        id: persona.id,
        userId: persona.userId,
        name: persona.name,
        persona: persona.persona,
        isDefault: persona.isDefault,
        gender: persona.gender || undefined,
        sourceCharacterId: persona.sourceCharacterId || undefined,
        createdAt: persona.createdAt.toISOString(),
        updatedAt: persona.updatedAt.toISOString(),
      },
    };
  },

  async deletePersona(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const persona = await prisma.userPersona.findUnique({
      where: { id: req.id },
    });

    if (!persona) {
      throw new ConnectError('Persona not found', Code.NotFound);
    }

    if (persona.userId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    await prisma.userPersona.delete({
      where: { id: req.id },
    });

    return { success: true };
  },

  async setDefaultPersona(req, context: HandlerContext) {
    // Verify authentication
    const user = context.values.get(userContextKey);
    if (!user) {
      throw new ConnectError('Unauthorized', Code.Unauthenticated);
    }

    // Verify ownership
    const persona = await prisma.userPersona.findUnique({
      where: { id: req.id },
    });

    if (!persona) {
      throw new ConnectError('Persona not found', Code.NotFound);
    }

    if (persona.userId !== user.id) {
      throw new ConnectError('Forbidden', Code.PermissionDenied);
    }

    // Unset all defaults for this user
    await prisma.userPersona.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });

    // Set this persona as default
    const updatedPersona = await prisma.userPersona.update({
      where: { id: req.id },
      data: { isDefault: true },
    });

    return {
      persona: {
        id: updatedPersona.id,
        userId: updatedPersona.userId,
        name: updatedPersona.name,
        persona: updatedPersona.persona,
        isDefault: updatedPersona.isDefault,
        gender: updatedPersona.gender || undefined,
        sourceCharacterId: updatedPersona.sourceCharacterId || undefined,
        createdAt: updatedPersona.createdAt.toISOString(),
        updatedAt: updatedPersona.updatedAt.toISOString(),
      },
    };
  },
};
