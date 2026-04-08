import type { FastifyReply, FastifyRequest } from "fastify";

import type { ProjectsService } from "./projects.service.ts";
import type { CreateProjectBody, UpdateProjectBody } from "./projects.schemas.ts";

export const createProjectsController = (service: ProjectsService) => ({
  list: async (request: FastifyRequest, reply: FastifyReply) => {
    const projects = await service.listByUser(request.user!.id);
    return reply.code(200).send(projects);
  },

  create: async (request: FastifyRequest<{ Body: CreateProjectBody }>, reply: FastifyReply) => {
    const project = await service.create(request.user!.id, request.body);
    return reply.code(201).send(project);
  },

  getById: async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    const project = await service.getById(request.user!.id, request.params.projectId);
    return reply.code(200).send(project);
  },

  update: async (
    request: FastifyRequest<{ Params: { projectId: string }; Body: UpdateProjectBody }>,
    reply: FastifyReply,
  ) => {
    const project = await service.update(request.user!.id, request.params.projectId, request.body);
    return reply.code(200).send(project);
  },

  delete: async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    await service.delete(request.user!.id, request.params.projectId);
    return reply.code(204).send();
  },
});


