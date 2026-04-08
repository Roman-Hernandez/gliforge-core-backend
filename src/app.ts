import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import { sql } from "drizzle-orm";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";

import { env } from "./config/env.ts";
import { redis } from "./config/redis.ts";
import { db } from "./db/index.ts";
import { authRoutes } from "./modules/auth/auth.routes.ts";
import { iconsRoutes } from "./modules/icons/icons.routes.ts";
import { projectsRoutes } from "./modules/projects/projects.routes.ts";
import { versionsRoutes } from "./modules/versions/versions.routes.ts";
import { authenticatePluginRegister } from "./plugins/authenticate.ts";
import { errorHandlerPluginRegister } from "./plugins/error-handler.ts";
import { buildPublishQueue, iconProcessingQueue } from "./jobs/queue.ts";
import { storageService } from "./services/storage/local.storage.ts";

export const buildApp = () => {
  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            },
          }
        : true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    origin: env.NODE_ENV === "development" ? true : env.CORS_ORIGIN,
  });
  app.register(helmet);
  app.register(multipart, {
    limits: {
      fileSize: 2 * 1024 * 1024,
      files: 50,
    },
  });
  app.register(errorHandlerPluginRegister);
  app.register(authenticatePluginRegister, { db });

  app.get("/health", async (_request, reply) => {
    const [dbStatus, redisStatus] = await Promise.allSettled([
      db.execute(sql`select 1`),
      redis.ping(),
    ]);

    return reply.code(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
      db: dbStatus.status === "fulfilled" ? "ok" : "error",
      redis: redisStatus.status === "fulfilled" ? "ok" : "error",
    });
  });

  app.register(authRoutes, {
    prefix: "/api/v1/auth",
    db,
  });
  app.register(projectsRoutes, {
    prefix: "/api/v1/projects",
    db,
  });
  app.register(iconsRoutes, {
    prefix: "/api/v1/projects/:projectId/icons",
    db,
    storage: storageService,
    iconProcessingQueue,
  });
  app.register(versionsRoutes, {
    prefix: "/api/v1/projects/:projectId/versions",
    db,
    buildPublishQueue,
  });

  return app;
};


