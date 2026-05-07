import "dotenv/config";
import { createServerClient } from "@supabase/ssr";
import type { FastifyRequest, FastifyReply } from "fastify";

type CookieToSet = {
  name: string;
  value: string;
  // 선택 옵션 타입은 패키지 버전에 따라 차이 있음.
  // 안전하게 any/unknown으로 두고 필요 시 타입 재지정.
  options?: Record<string, unknown>;
};

export function getSupabaseServerClient(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // ✅ 새 시그니처
        getAll: () => {
          // Fastify req.cookies -> 배열 변환
          return Object.entries(req.cookies).map(([name, value]) => ({
            name,
            value: String(value ?? ""),
          }));
        },
        setAll: (cookiesToSet: CookieToSet[]) => {
          for (const { name, value, options } of cookiesToSet) {
            rep.setCookie(name, value, {
              ...(options as any),
              httpOnly: true,
              secure: false, // prod: true
              sameSite: "lax",
              path: "/",
            });
          }
        },
      },
    },
  );
}
