import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { authenticateUser } from '../plugins/auth.js';

export async function authRoutes(server: FastifyInstance) {
  const authService = new AuthService();

  // POST /auth/signup
  server.post('/auth/signup', {
    config: {
      rateLimit: {
        max: 3, // IP당 3회 가입 시도/시간
        timeWindow: '1 hour',
      },
    },
  }, async (request, reply) => {
    const { email, password, displayName } = request.body as {
      email: string;
      password: string;
      displayName: string;
    };

    try {
      const result = await authService.signUp({
        email,
        password,
        displayName,
      });

      return reply.send({
        data: result,
      });
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'SIGNUP_FAILED',
          message: error.message,
        },
      });
    }
  });

  // POST /auth/login
  server.post('/auth/login', {
    config: {
      rateLimit: {
        max: 5, // IP당 5회 로그인 시도/분
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    try {
      const result = await authService.signIn({ email, password });

      return reply.send({
        data: result,
      });
    } catch (error: any) {
      // 타이밍 공격 방지: 실패 시 추가 지연
      await new Promise(resolve => setTimeout(resolve, 1000));

      return reply.status(401).send({
        error: {
          code: 'LOGIN_FAILED',
          message: error.message,
        },
      });
    }
  });

  // GET /auth/me
  server.get(
    '/auth/me',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const profile = await authService.getMe(request.user!.id);

        return reply.send({
          data: profile,
        });
      } catch (error: any) {
        return reply.status(404).send({
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }
  );

  // POST /auth/ensure-profile (for OAuth users)
  server.post(
    '/auth/ensure-profile',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const profile = await authService.ensureProfile(request.user!.id);

        return reply.send({
          data: profile,
        });
      } catch (error: any) {
        return reply.status(500).send({
          error: {
            code: 'ENSURE_PROFILE_FAILED',
            message: error.message,
          },
        });
      }
    }
  );

  // DELETE /auth/account
  server.delete(
    '/auth/account',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        await authService.deleteAccount(request.user!.id);

        return reply.send({
          data: { success: true },
        });
      } catch (error: any) {
        return reply.status(400).send({
          error: {
            code: 'DELETE_ACCOUNT_FAILED',
            message: error.message,
          },
        });
      }
    }
  );
}
