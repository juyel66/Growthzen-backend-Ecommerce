import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from "../constants/auth";
import type { JwtUserPayload } from "../modules/auth/auth.interface";

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is missing");
  }

  return secret;
};

const getRefreshTokenSecret = (): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;

  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is missing");
  }

  return secret;
};

export const signAccessToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES_IN };
  return jwt.sign(payload, getAccessTokenSecret(), options);
};

export const signRefreshToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRES_IN };
  return jwt.sign(payload, getRefreshTokenSecret(), options);
};

export const verifyAccessToken = (token: string): JwtPayload & JwtUserPayload => {
  return jwt.verify(token, getAccessTokenSecret()) as JwtPayload & JwtUserPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload & JwtUserPayload => {
  return jwt.verify(token, getRefreshTokenSecret()) as JwtPayload & JwtUserPayload;
};