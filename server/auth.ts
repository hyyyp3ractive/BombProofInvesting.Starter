import { randomBytes, createHash } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config";
import type { User } from "@shared/schema";

export interface JWTPayload {
  sub: string; // user id
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateTokens(user: User) {
  const now = Math.floor(Date.now() / 1000);
  
  // Access token (short-lived)
  const accessToken = jwt.sign({
    sub: user.id,
    iss: "crypto-evaluator",
    aud: "web",
    exp: now + (config.JWT_ACCESS_TTL_MIN * 60),
    iat: now,
  } as JWTPayload, config.JWT_ACCESS_SECRET);
  
  // Refresh token (longer-lived, will be hashed for storage)
  const refreshToken = jwt.sign({
    sub: user.id,
    iss: "crypto-evaluator",
    aud: "refresh",
    exp: now + (config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60),
    iat: now,
  } as JWTPayload, config.JWT_REFRESH_SECRET);
  
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateEmailCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashEmailCode(code: string): string {
  return createHash("sha256").update(code + "salt").digest("hex");
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
