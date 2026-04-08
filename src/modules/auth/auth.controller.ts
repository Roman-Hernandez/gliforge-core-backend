import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthService } from "./auth.service.ts";
import type { LoginBody, LogoutBody, RefreshBody, RegisterBody } from "./auth.schemas.ts";

export const createAuthController = (service: AuthService) => ({
  register: async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
    const response = await service.register(request.body);
    return reply.code(201).send(response);
  },

  login: async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
    const response = await service.login(request.body);
    return reply.code(200).send(response);
  },

  refresh: async (request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) => {
    const response = await service.refresh(request.body);
    return reply.code(200).send(response);
  },

  logout: async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as LogoutBody;
    await service.logout(request.user!.id, body.refreshToken);
    return reply.code(204).send();
  },

  me: async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await service.me(request.user!.id);
    return reply.code(200).send({ user });
  },
});


