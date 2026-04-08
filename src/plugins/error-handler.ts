import { STATUS_CODES } from "node:http";

import fp from "fastify-plugin";
import { ZodError } from "zod";

import { env } from "../config/env.ts";
import { AppError } from "../utils/errors.ts";

const errorHandlerPlugin = fp(async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: STATUS_CODES[error.statusCode] ?? "Error",
        message: error.message,
      });
    }

    fastify.log.error(error);

    const statusCode = 500;

    return reply.status(statusCode).send({
      statusCode,
      error: STATUS_CODES[statusCode] ?? "Internal Server Error",
      message: env.NODE_ENV === "production" ? "Something went wrong" : error.message,
    });
  });
});

export const errorHandlerPluginRegister = errorHandlerPlugin;


