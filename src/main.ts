import "dotenv/config";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { swaggerConfig, swaggerUiConfig } from "./config/swagger";
import routes from "./routes";

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

// CORS 설정
fastify.register(cors, {
  origin: true,
  credentials: true,
});

// Cookie (필수 설정)
fastify.register(fastifyCookie, {
  secret: "dev-secret", // prod 단계일 때는 env에 따로 정의해야함
  parseOptions: { sameSite: "lax", path: "/" },
});

// cookie
// fastify.register(fastifyCookie, {
//   seceret: 'dev-secret',
//   parseOptions: { sameSite: 'lax', path: '/' },
// })

// swagger 설정
fastify.register(fastifySwagger, swaggerConfig);
fastify.register(fastifySwaggerUi, swaggerUiConfig);
fastify.register(routes);

fastify.ready().then(() => {
  fastify.log.info(
    {
      hasUrl: !!process.env.SUPABASE_URL,
      hasPubl: !!process.env.SUPABASE_PUBLISHABLE_KEY,
      hasAnon: !!process.env.SUPABASE_ANON_KEY,
      hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    "supabase env check",
  );
});

const start = async () => {
  try {
    await fastify.listen({ port: 8083 }, () => {
      if (process.send) process.send("ready");
      console.log("Server Start!");
    });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
