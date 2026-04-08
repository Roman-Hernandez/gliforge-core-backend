import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.ts";

export type TokenType = "access" | "refresh";

export interface JwtPayload {
  sub: string;
  email: string;
  type: TokenType;
}

const accessTokenExpiry = env.JWT_ACCESS_EXPIRY as NonNullable<SignOptions["expiresIn"]>;
const refreshTokenExpiry = env.JWT_REFRESH_EXPIRY as NonNullable<SignOptions["expiresIn"]>;

export const signAccessToken = (payload: Omit<JwtPayload, "type">): string =>
  jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: accessTokenExpiry,
  });

export const signRefreshToken = (payload: Omit<JwtPayload, "type">): string =>
  jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: refreshTokenExpiry,
  });

const parseToken = (decoded: string | jwt.JwtPayload): JwtPayload => {
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  if (typeof decoded.sub !== "string" || typeof decoded.email !== "string") {
    throw new Error("Invalid token payload");
  }

  if (decoded.type !== "access" && decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  return {
    sub: decoded.sub,
    email: decoded.email,
    type: decoded.type,
  };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  const payload = parseToken(decoded);

  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return payload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  const payload = parseToken(decoded);

  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  return payload;
};


