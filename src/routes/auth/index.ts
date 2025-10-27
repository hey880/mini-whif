import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getSupabaseServerClient } from '../../lib/supabase'

const REDIRECT_AFTER_LOGIN = process.env.POST_LOGIN_REDIRECT!
const MANUAL_CAPTURE_URL = process.env.POST_LOGIN_MANUAL!

const authRoute = async (fastify: FastifyInstance) => {
  // Kakao 로그인 시작
  fastify.get('/login/kakao', {
    schema: {
      summary: 'Kakao OAuth 로그인 시작',
      querystring: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['redirect', 'json'],
            description: '리다이렉트 또는 authUrl JSON 반환',
          },
          flow: {
            type: 'string',
            enum: ['auto', 'manual'],
            description: 'manual은 /auth/manual-capture로 귀환',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { authUrl: { type: 'string' } },
          description: 'mode=json일 때만',
        },
        302: { description: 'Kakao 인증페이지로 리다이렉트' },
      },
    },
    handler: async (req: FastifyRequest, rep: FastifyReply) => {
      const supabase = getSupabaseServerClient(req, rep)
      const q = req.query as {
        mode?: 'redirect' | 'json'
        flow?: 'auto' | 'manual'
      }
      const mode = q.mode ?? 'redirect'
      const flow = q.flow ?? 'auto'

      const redirectTo = flow === 'manual' ? MANUAL_CAPTURE_URL : REDIRECT_AFTER_LOGIN

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          scopes: 'profile_nickname',
          // supabase의 kakao provider가 기본적으로 account_email, profile_image를 함께 요청
          // 하고 있기 때문에 스코프를 지정해줘도 계속해서 account email, profile image를 요청함...
          // 동의 안한 스코프를 가져오려 할 경우 KOE205 에러 발생함
        },
      })

      if (error) return rep.code(500).send({ error: error.message })

      if (mode === 'json') return { authUrl: data.url }
      return rep.redirect(data.url)
    },
  })

  // Kakao → (Supabase) → 우리 앱으로 돌아오는 콜백
  fastify.get('/callback', {
    schema: {
      summary: 'Kakao OAuth 콜백',
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          debug: { type: 'string' },
        },
        required: ['code'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            session: { type: 'object' },
          },
          description: 'debug=1일 때만 JSON 반환',
        },
        302: { description: '로그인 후 리다이렉트' },
      },
    },
    handler: async (req: FastifyRequest, rep: FastifyReply) => {
      const supabase = getSupabaseServerClient(req, rep)
      const { code, debug } = req.query as { code: string; debug?: string }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) return rep.code(400).send({ error: error.message })

      if (debug) return { user: data.user, session: data.session }
      return rep.redirect('/')
    },
  })

  // Postman 수동 캡처 페이지 (브라우저에서 code 확인)
  fastify.get('/manual-capture', {
    schema: { summary: '수동 캡처 페이지 (테스트용)' },
    handler: async (req: FastifyRequest, rep: FastifyReply) => {
      const { code, state, error, error_description } = req.query as Record<
        string,
        string | undefined
      >
      const html = `
      <html><body style="font-family: sans-serif">
        <h2>Manual Capture</h2>
        ${
          error
            ? `<p style="color:red">Error: ${error}<br/>${error_description ?? ''}</p>`
            : `<p><b>code:</b> ${code ?? '(없음)'}<br/><b>state:</b> ${state ?? '(없음)'}</p>
               <p>이 code 값을 복사해 Postman에서 <code>/auth/callback?code=...</code> 로 호출하세요.</p>
               <p>테스트 편의: <code>/auth/callback?code=...&debug=1</code> 호출 시 세션 JSON 반환</p>`
        }
      </body></html>`
      rep.type('text/html').send(html)
    },
  })

  // 내 세션 확인
  fastify.get('/me', {
    schema: {
      summary: '현재 사용자 조회',
      response: {
        200: {
          type: 'object',
          properties: { user: { type: 'object', nullable: true } },
        },
      },
    },
    handler: async (req: FastifyRequest, rep: FastifyReply) => {
      const supabase = getSupabaseServerClient(req, rep)
      const { data } = await supabase.auth.getUser()
      return { user: data.user ?? null }
    },
  })

  // 로그아웃
  fastify.post('/logout', {
    schema: { summary: '로그아웃' },
    handler: async (req: FastifyRequest, rep: FastifyReply) => {
      const supabase = getSupabaseServerClient(req, rep)
      await supabase.auth.signOut()
      return { ok: true }
    },
  })
}

export default authRoute
