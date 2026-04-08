import fp from "fastify-plugin";
import { eq } from "drizzle-orm";

import type { Database } from "../db/index.ts";

import { users } from "../db/schema/index.ts";
import { AppError } from "../utils/errors.ts";
import { verifyAccessToken } from "../utils/jwt.ts";

interface AuthenticatePluginOptions {
  db: Database;
}

const authenticatePlugin = fp<AuthenticatePluginOptions>(async (fastify, options) => {
  fastify.decorateRequest("user", null);

  fastify.decorate("authenticate", async (request) => {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("Missing or invalid authorization header", 401, "UNAUTHORIZED");
    }

    const token = authorization.slice("Bearer ".length);

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError("Invalid access token", 401, "UNAUTHORIZED");
    }

    const user = await options.db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw new AppError("User not found for this token", 401, "UNAUTHORIZED");
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });
});

export const authenticatePluginRegister = authenticatePlugin;


