import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "Invalid request", result.error.flatten());
  }
  return result.data;
}

export function idParam(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Invalid id");
  return id;
}

export async function requestBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

type RouteHandler<Params> = (req: NextRequest, ctx: { params: Promise<Params> }) => unknown | Promise<unknown>;

export function route<Params extends Record<string, unknown> = Record<string, string>>(handler: RouteHandler<Params>) {
  return async (req: NextRequest, ctx: { params: Promise<Params> }) => {
    try {
      const result = await handler(req, ctx);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, ...(error.details ? { details: error.details } : {}) },
          { status: error.status }
        );
      }
      console.error(error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
