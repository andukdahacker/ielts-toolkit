import Fastify from "fastify"
import cors from "@fastify/cors"
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod"
import { env } from "./config/env.js"

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: env.WEB_URL,
    credentials: true,
  })

  app.get("/api/health", async () => {
    return { status: "ok" }
  })

  return app
}
