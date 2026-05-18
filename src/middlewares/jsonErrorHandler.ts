import type { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus";

export const jsonErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof SyntaxError) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: "Invalid JSON payload",
    });
  }
  return next(err);
};

