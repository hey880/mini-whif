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

// ConnectRPC Services
import { CharacterService } from '@persona-chat/proto/gen/ts/character_connect.js';
import { PersonaService } from '@persona-chat/proto/gen/ts/persona_connect.js';
import { ChatRoomService } from '@persona-chat/proto/gen/ts/chatroom_connect.js';
import { LlmModelService } from '@persona-chat/proto/gen/ts/llmmodel_connect.js';

// ConnectRPC Handlers
import { characterHandler } from './rpc/character.handler.js';
import { personaHandler } from './rpc/persona.handler.js';
import { chatRoomHandler } from './rpc/chatroom.handler.js';
import { llmModelHandler } from './rpc/llmmodel.handler.js';
import { userContextKey } from './context.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

async function start() {
  const server = createServer();

  try {
    // Register ConnectRPC plugin
    await server.register(fastifyConnectPlugin, {
      routes(router) {
        router.service(CharacterService, characterHandler);
        router.service(PersonaService, personaHandler);
        router.service(ChatRoomService, chatRoomHandler);
        router.service(LlmModelService, llmModelHandler);
      },
      // Pass user context from auth middleware to RPC handlers
      contextValues(req) {
        const values = createContextValues();
        values.set(userContextKey, req.user);
        return values;
      },
    });

    // Register REST routes
    await server.register(authRoutes);
    await server.register(keywordsRoutes);
    await server.register(mypageRoutes);
    await server.register(chatRoutes);
    await server.register(paymentsRoutes);

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
    console.log(`   ConnectRPC services: CharacterService, PersonaService, ChatRoomService, LlmModelService`);
    console.log('');
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();
