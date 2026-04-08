import { and, eq, lte } from "drizzle-orm";
import { createHash } from "node:crypto";

import type { Database } from "../../db/index.ts";
import type { LoginBody, PublicUserDto, RefreshBody, RegisterBody } from "./auth.schemas.ts";

import { refreshTokens, users } from "../../db/schema/index.ts";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors.ts";
import { compareHash, hashValue } from "../../utils/hash.ts";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.ts";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: PublicUserDto;
}

const hashRefreshTokenValue = (token: string): string => createHash("sha256").update(token).digest("hex");

const extractRefreshExpiry = (token: string): Date => {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Invalid refresh token");
  }

  const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    exp?: number;
  };

  if (typeof decodedPayload.exp !== "number") {
    throw new Error("Refresh token is missing exp");
  }

  return new Date(decodedPayload.exp * 1000);
};

const toPublicUser = (user: {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}): PublicUserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  plan: user.plan,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export class AuthService {
  constructor(private readonly db: Database) {}

  private async issueTokens(user: {
    id: string;
    email: string;
    name: string;
    plan: "free" | "pro" | "enterprise";
    createdAt: Date;
    updatedAt: Date;
  }): Promise<AuthResponse> {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
    });

    const refreshToken = signRefreshToken({
      sub: user.id,
      email: user.email,
    });

    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashRefreshTokenValue(refreshToken),
      expiresAt: extractRefreshExpiry(refreshToken),
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  async register(input: RegisterBody): Promise<AuthResponse> {
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashValue(input.password);

    const [createdUser] = await this.db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        plan: users.plan,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!createdUser) {
      throw new Error("Failed to create user");
    }

    return this.issueTokens(createdUser);
  }

  async login(input: LoginBody): Promise<AuthResponse> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401, "UNAUTHORIZED");
    }

    const isPasswordValid = await compareHash(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401, "UNAUTHORIZED");
    }

    await this.db.delete(refreshTokens).where(and(eq(refreshTokens.userId, user.id), lte(refreshTokens.expiresAt, new Date())));

    return this.issueTokens(user);
  }

  async refresh(input: RefreshBody): Promise<AuthTokens> {
    let payload;

    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
    }

    const tokenHash = hashRefreshTokenValue(input.refreshToken);

    const tokenRecord = await this.db.query.refreshTokens.findFirst({
      where: and(eq(refreshTokens.userId, payload.sub), eq(refreshTokens.tokenHash, tokenHash)),
    });

    if (!tokenRecord || tokenRecord.expiresAt <= new Date()) {
      throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
    }

    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const tokens = await this.issueTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.db
        .delete(refreshTokens)
        .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.tokenHash, hashRefreshTokenValue(refreshToken))));

      return;
    }

    await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  async me(userId: string): Promise<PublicUserDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return toPublicUser(user);
  }
}


