import Fastify from "fastify"
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox"
import cors from "@fastify/cors"
import fastifySwagger from "@fastify/swagger"
import fastifySwaggerUi from "@fastify/swagger-ui"
import { swaggerConfig, swaggerUiConfig } from "./config/swagger"

const fastify = Fastify({
    logger: true,
}).withTypeProvider<TypeBoxTypeProvider>()

fastify.register(cors, {
    origin: true,
    credentials: true,
})

fastify.register(fastifySwagger, swaggerConfig)
fastify.register(fastifySwaggerUi, swaggerUiConfig)

const start = async () => {
    try{
        await fastify.listen({port: 8083}, () => {
            if(process.send) process.send("ready")
            console.log("Server Start!")
        })
    } catch(error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

start();