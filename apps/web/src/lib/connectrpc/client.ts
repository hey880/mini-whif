import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { CharacterService } from '../../../../../packages/proto/gen/ts/character_connect';
import { PersonaService } from '../../../../../packages/proto/gen/ts/persona_connect';
import { ChatRoomService } from '../../../../../packages/proto/gen/ts/chatroom_connect';
import { LlmModelService } from '../../../../../packages/proto/gen/ts/llmmodel_connect';
import { UniverseService } from '../../../../../packages/proto/gen/ts/universe_connect';
import { supabase } from '../supabase';

// Create transport with auth interceptor
const transport = createConnectTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  interceptors: [
    (next) => async (req) => {
      // Get current session from Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Attach JWT token if available
      if (session?.access_token) {
        req.header.set('Authorization', `Bearer ${session.access_token}`);
      }

      return next(req);
    },
  ],
});

// Create typed clients for each service
export const characterClient = createClient(CharacterService, transport);
export const personaClient = createClient(PersonaService, transport);
export const chatRoomClient = createClient(ChatRoomService, transport);
export const llmModelClient = createClient(LlmModelService, transport);
export const universeClient = createClient(UniverseService, transport);
