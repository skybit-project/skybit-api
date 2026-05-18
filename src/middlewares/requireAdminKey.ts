import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { HttpStatus } from "../constants/httpStatus";

const extractBearer = (authorization: string | undefined): string | null => {
  if (!authorization) return null;
  const m = authorization.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim();
  return token ? token : null;
};

export const requireAdminKey = (req: Request, res: Response, next: NextFunction) => {
  if (config.SKYBIT_PUBLIC_API) {
    return next();
  }

  const expected = config.SKYBIT_ADMIN_API_KEY;
  if (!expected) {
    // dev convenience; production is enforced in config
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "SKYBIT_ADMIN_API_KEY not configured",
    });
  }

  const provided =
    (req.headers["x-api-key"] as string | undefined)?.trim() ||
    extractBearer(req.headers.authorization || undefined);

  if (!provided || provided !== expected) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      error: "Unauthorized",
    });
  }

  return next();
};
