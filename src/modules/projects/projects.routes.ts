import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { Database } from "../../db/index.ts";

import { createProjectsController } from "./projects.controller.ts";
import {
  createProjectBodySchema,
  projectDetailSchema,
  projectParamsSchema,
  projectSummarySchema,
  updateProjectBodySchema,
} from "./projects.schemas.ts";
import { ProjectsService } from "./projects.service.ts";

interface ProjectRoutesOptions {
  db: Database;
}

export const projectsRoutes: FastifyPluginAsync<ProjectRoutesOptions> = async (fastify, options) => {
  const service = new ProjectsService(options.db);
  const controller = createProjectsController(service);

  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: z.array(projectSummarySchema),
        },
      },
    },
    controller.list,
  );

  fastify.post(
    "/",
    {
      schema: {
        body: createProjectBodySchema,
        response: {
          201: projectDetailSchema,
        },
      },
    },
    controller.create,
  );

  fastify.get(
    "/:projectId",
    {
      schema: {
        params: projectParamsSchema,
        response: {
          200: projectDetailSchema,
        },
      },
    },
    controller.getById,
  );

  fastify.patch(
    "/:projectId",
    {
      schema: {
        params: projectParamsSchema,
        body: updateProjectBodySchema,
        response: {
          200: projectDetailSchema,
        },
      },
    },
    controller.update,
  );

  fastify.delete(
    "/:projectId",
    {
      schema: {
        params: projectParamsSchema,
        response: {
          204: z.null(),
        },
      },
    },
    controller.delete,
  );
};


