import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { Database } from "../../db/index.ts";

import { createVersionsController } from "./versions.controller.ts";
import { createVersionBodySchema, projectParamsSchema, versionParamsSchema, versionSchema } from "./versions.schemas.ts";
import { VersionsService } from "./versions.service.ts";

interface VersionRoutesOptions {
  db: Database;
  buildPublishQueue: {
    add(name: string, data: { versionId: string; projectId: string; userId: string }): Promise<unknown>;
  };
}

export const versionsRoutes: FastifyPluginAsync<VersionRoutesOptions> = async (fastify, options) => {
  const service = new VersionsService(options.db, options.buildPublishQueue);
  const controller = createVersionsController(service);

  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get(
    "/",
    {
      schema: {
        params: projectParamsSchema,
        response: {
          200: z.array(versionSchema),
        },
      },
    },
    controller.list,
  );

  fastify.post(
    "/",
    {
      schema: {
        params: projectParamsSchema,
        body: createVersionBodySchema,
        response: {
          201: versionSchema,
        },
      },
    },
    controller.create,
  );

  fastify.get(
    "/:versionId",
    {
      schema: {
        params: versionParamsSchema,
        response: {
          200: versionSchema,
        },
      },
    },
    controller.getById,
  );
};


