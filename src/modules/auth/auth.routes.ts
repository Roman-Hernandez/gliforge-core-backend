import type { FastifyPluginAsync } from "fastify";

import type { Database } from "../../db/index.ts";

import { createAuthController } from "./auth.controller.ts";
import {
  authResponseSchema,
  authTokensSchema,
  loginBodySchema,
  logoutBodySchema,
  meResponseSchema,
  refreshBodySchema,
  registerBodySchema,
} from "./auth.schemas.ts";
import { AuthService } from "./auth.service.ts";

interface AuthRoutesOptions {
  db: Database;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, options) => {
  const service = new AuthService(options.db);
  const controller = createAuthController(service);

  fastify.post(
    "/register",
    {
      schema: {
        body: registerBodySchema,
        response: {
          201: authResponseSchema,
        },
      },
    },
    controller.register,
  );

  fastify.post(
    "/login",
    {
      schema: {
        body: loginBodySchema,
        response: {
          200: authResponseSchema,
        },
      },
    },
    controller.login,
  );

  fastify.post(
    "/refresh",
    {
      schema: {
        body: refreshBodySchema,
        response: {
          200: authTokensSchema,
        },
      },
    },
    controller.refresh,
  );

  fastify.post(
    "/logout",
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: logoutBodySchema,
        response: {
          204: meResponseSchema.nullable(),
        },
      },
    },
    controller.logout,
  );

  fastify.get(
    "/me",
    {
      preHandler: [fastify.authenticate],
      schema: {
        response: {
          200: meResponseSchema,
        },
      },
    },
    controller.me,
  );
};


