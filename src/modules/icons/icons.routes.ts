import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { Database } from "../../db/index.ts";
import type { IStorageService } from "../../services/storage/storage.interface.ts";

import { createIconsController } from "./icons.controller.ts";
import {
  bulkDeleteIconsBodySchema,
  bulkDeleteIconsResponseSchema,
  iconParamsSchema,
  iconSchema,
  listIconsQuerySchema,
  paginatedIconsSchema,
  projectParamsSchema,
  renameIconBodySchema,
  uploadIconsResponseSchema,
} from "./icons.schemas.ts";
import { IconsService } from "./icons.service.ts";

interface IconRoutesOptions {
  db: Database;
  storage: IStorageService;
  iconProcessingQueue: {
    add(name: string, data: { iconId: string; projectId: string; storageKey: string }): Promise<unknown>;
  };
}

export const iconsRoutes: FastifyPluginAsync<IconRoutesOptions> = async (fastify, options) => {
  const service = new IconsService(options.db, options.storage, options.iconProcessingQueue);
  const controller = createIconsController(service);

  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get(
    "/",
    {
      schema: {
        params: projectParamsSchema,
        querystring: listIconsQuerySchema,
        response: {
          200: paginatedIconsSchema,
        },
      },
    },
    controller.list,
  );

  fastify.post(
    "/upload",
    {
      schema: {
        params: projectParamsSchema,
        body: z.any(),
        response: {
          201: uploadIconsResponseSchema,
        },
      },
    },
    controller.upload,
  );

  fastify.patch(
    "/:iconId",
    {
      schema: {
        params: iconParamsSchema,
        body: renameIconBodySchema,
        response: {
          200: iconSchema,
        },
      },
    },
    controller.rename,
  );

  fastify.delete(
    "/:iconId",
    {
      schema: {
        params: iconParamsSchema,
        response: {
          204: z.null(),
        },
      },
    },
    controller.deleteOne,
  );

  fastify.delete(
    "/",
    {
      schema: {
        params: projectParamsSchema,
        body: bulkDeleteIconsBodySchema,
        response: {
          200: bulkDeleteIconsResponseSchema,
        },
      },
    },
    controller.bulkDelete,
  );
};


