import type { FastifyReply, FastifyRequest } from "fastify";

import type { VersionsService } from "./versions.service.ts";
import type { CreateVersionBody } from "./versions.schemas.ts";

export const createVersionsController = (service: VersionsService) => ({
  list: async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    const versions = await service.list(request.user!.id, request.params.projectId);
    return reply.code(200).send(versions);
  },

  create: async (
    request: FastifyRequest<{ Params: { projectId: string }; Body: CreateVersionBody }>,
    reply: FastifyReply,
  ) => {
    const version = await service.create(request.user!.id, request.params.projectId, request.body);
    return reply.code(201).send(version);
  },

  getById: async (
    request: FastifyRequest<{ Params: { projectId: string; versionId: string } }>,
    reply: FastifyReply,
  ) => {
    const version = await service.getById(request.user!.id, request.params.projectId, request.params.versionId);
    return reply.code(200).send(version);
  },
});


