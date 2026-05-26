// CRITICAL: New Relic must be first import
if (process.env.NEW_RELIC_LICENSE_KEY) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  require('newrelic');
}

import 'dotenv/config';
import { fastifyConnectPlugin } from '@connectrpc/connect-fastify';
import { createContextValues } from '@connectrpc/connect';
import { createServer } from './config/fastify.js';

// REST Routes
import { authRoutes } from './routes/auth.routes.js';
import { keywordsRoutes } from './routes/keywords.routes.js';
import { mypageRoutes } from './routes/mypage.routes.js';
import { chatRoutes } from './routes/chat.routes.js';
import { paymentsRoutes } from './routes/payments.routes.js';
import { messageRoutes } from './routes/message.routes.js';
import { chatroomExtraRoutes } from './routes/chatroom-extra.routes.js';

// ConnectRPC Services
import { CharacterService } from '@persona-chat/proto/gen/ts/character_connect.js';
import { PersonaService } from '@persona-chat/proto/gen/ts/persona_connect.js';
import { ChatRoomService } from '@persona-chat/proto/gen/ts/chatroom_connect.js';
import { LlmModelService } from '@persona-chat/proto/gen/ts/llmmodel_connect.js';
import { UniverseService } from '@persona-chat/proto/gen/ts/universe_connect.js';

// ConnectRPC Handlers
import { createCharacterHandler } from './rpc/character.handler.js';
import { createPersonaHandler } from './rpc/persona.handler.js';
import { chatRoomHandler } from './rpc/chatroom.handler.js';
import { llmModelHandler } from './rpc/llmmodel.handler.js';
import { universeHandler } from './rpc/universe.handler.js';
import { userContextKey } from './context.js';
import { supabase } from './config/supabase.js';
import { prisma } from './config/prisma.js';

// Phase 3: Repository implementations
import { PrismaChatRoomRepository } from './infrastructure/repositories/PrismaChatRoomRepository.js';
import { PrismaMessageRepository } from './infrastructure/repositories/PrismaMessageRepository.js';
import { PrismaGemWalletRepository } from './infrastructure/repositories/PrismaGemWalletRepository.js';
import { PrismaLlmModelRepository } from './infrastructure/repositories/PrismaLlmModelRepository.js';
import { PrismaCharacterRepository } from './infrastructure/repositories/PrismaCharacterRepository.js';
import { PrismaPersonaRepository } from './infrastructure/repositories/PrismaPersonaRepository.js';
import { PrismaVectorSearchRepository } from './infrastructure/repositories/PrismaVectorSearchRepository.js';

// Phase 3: Services
import { ChatService } from './application/services/ChatService.js';
import { MessageService } from './application/services/MessageService.js';
import { CharacterService as CharacterAppService } from './application/services/CharacterService.js';
import { PersonaService as PersonaAppService } from './application/services/PersonaService.js';
import { EmbeddingService } from './application/services/EmbeddingService.js';
import { AIStreamingService } from './services/ai-streaming.service.js';

// Cron Jobs
import cron from 'node-cron';
import { runEmbeddingBatch } from './jobs/embedding-batch.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

async function start() {
  const server = createServer();

  // === Dependency Injection Container (Phase 3) ===

  // 1. Initialize Repositories
  const chatRoomRepo = new PrismaChatRoomRepository(prisma);
  const messageRepo = new PrismaMessageRepository(prisma);
  const gemWalletRepo = new PrismaGemWalletRepository(prisma);
  const llmModelRepo = new PrismaLlmModelRepository(prisma);
  const characterRepo = new PrismaCharacterRepository(prisma);
  const personaRepo = new PrismaPersonaRepository(prisma);
  const vectorSearchRepo = new PrismaVectorSearchRepository(prisma);

  // 2. Initialize Services (with injected dependencies)
  const aiStreamingService = new AIStreamingService();
  const embeddingService = new EmbeddingService(prisma);

  const chatService = new ChatService(
    prisma,
    chatRoomRepo,
    messageRepo,
    gemWalletRepo,
    llmModelRepo,
    vectorSearchRepo,
    embeddingService,
    aiStreamingService,
    server
  );

  const messageService = new MessageService(
    prisma,
    messageRepo,
    gemWalletRepo,
    llmModelRepo,
    aiStreamingService,
    server
  );

  const characterService = new CharacterAppService(characterRepo);
  const personaService = new PersonaAppService(personaRepo);

  // === End DI Container ===

  try {
    // Auth hook for ConnectRPC routes
    server.addHook('preHandler', async (request, reply) => {
      // Only apply to ConnectRPC routes
      if (request.url.startsWith('/persona_chat.')) {
        try {
          const authHeader = request.headers.authorization;

          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            // Verify JWT with Supabase
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (!error && user) {
              // Attach user to request
              request.user = {
                id: user.id,
                email: user.email!,
              };
              request.log.debug({ userId: user.id }, 'User authenticated for ConnectRPC');
            } else {
              request.log.debug('No valid user found in token');
            }
          } else {
            request.log.debug('No authorization header found');
          }
        } catch (error) {
          request.log.error({ error }, 'Failed to authenticate user for ConnectRPC');
        }
      }
    });

    // Register ConnectRPC plugin
    await server.register(fastifyConnectPlugin, {
      routes(router) {
        router.service(CharacterService, createCharacterHandler(characterService));
        router.service(PersonaService, createPersonaHandler(personaService));
        router.service(ChatRoomService, chatRoomHandler);
        router.service(LlmModelService, llmModelHandler);
        router.service(UniverseService, universeHandler);
      },
      // Pass user context from request to RPC handlers
      contextValues(req) {
        const values = createContextValues();
        // req.user is set by preHandler hook above
        values.set(userContextKey, req.user);
        return values;
      },
    });

    // Register REST routes
    await server.register(authRoutes);
    await server.register(keywordsRoutes);
    await server.register(mypageRoutes);

    // Phase 3: Inject services into routes
    await server.register(chatRoutes, { chatService });

    await server.register(paymentsRoutes);
    await server.register(messageRoutes, { messageService });
    await server.register(chatroomExtraRoutes);

    // Health check
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    await server.listen({ port: PORT, host: HOST });

    console.log('');
    console.log('🚀 Persona Chat API Server');
    console.log(`   Server listening on http://localhost:${PORT}`);
    console.log(`   Swagger docs: http://localhost:${PORT}/docs`);
    console.log(`   ConnectRPC services: CharacterService, PersonaService, ChatRoomService, LlmModelService, UniverseService`);
    console.log('');

    // ============================================
    // Register Cron Jobs
    // ============================================

    // 임베딩 배치 작업: 매일 자정 실행
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Running embedding batch job...');
      try {
        await runEmbeddingBatch();
        console.log('[Cron] Embedding batch job completed');
      } catch (error) {
        console.error('[Cron] Embedding batch job failed:', error);
      }
    });

    console.log('⏰ Cron jobs registered:');
    console.log('   - Embedding batch: Daily at 00:00 (0 0 * * *)');
    console.log('');
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();
