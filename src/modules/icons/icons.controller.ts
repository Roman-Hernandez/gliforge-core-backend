import type { MultipartFile } from "@fastify/multipart";
import type { FastifyReply, FastifyRequest } from "fastify";

import type { IconsService, UploadedIconInput } from "./icons.service.ts";
import type { BulkDeleteIconsBody, ListIconsQuery, RenameIconBody } from "./icons.schemas.ts";

const collectFiles = async (parts: AsyncIterableIterator<MultipartFile>): Promise<UploadedIconInput[]> => {
  const files: UploadedIconInput[] = [];

  for await (const part of parts) {
    files.push({
      filename: part.filename,
      mimetype: part.mimetype,
      buffer: await part.toBuffer(),
    });
  }

  return files;
};

export const createIconsController = (service: IconsService) => ({
  list: async (
    request: FastifyRequest<{ Params: { projectId: string }; Querystring: ListIconsQuery }>,
    reply: FastifyReply,
  ) => {
    const response = await service.list(request.user!.id, request.params.projectId, request.query);
    return reply.code(200).send(response);
  },

  upload: async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    const files = await collectFiles(request.files());
    const response = await service.upload(request.user!.id, request.params.projectId, files);
    return reply.code(201).send(response);
  },

  rename: async (
    request: FastifyRequest<{ Params: { projectId: string; iconId: string }; Body: RenameIconBody }>,
    reply: FastifyReply,
  ) => {
    const response = await service.rename(request.user!.id, request.params.projectId, request.params.iconId, request.body);
    return reply.code(200).send(response);
  },

  deleteOne: async (
    request: FastifyRequest<{ Params: { projectId: string; iconId: string } }>,
    reply: FastifyReply,
  ) => {
    await service.deleteOne(request.user!.id, request.params.projectId, request.params.iconId);
    return reply.code(204).send();
  },

  bulkDelete: async (
    request: FastifyRequest<{ Params: { projectId: string }; Body: BulkDeleteIconsBody }>,
    reply: FastifyReply,
  ) => {
    const response = await service.bulkDelete(request.user!.id, request.params.projectId, request.body);
    return reply.code(200).send(response);
  },
});


