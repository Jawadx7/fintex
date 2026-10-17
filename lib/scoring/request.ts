// Shared request/error handling for the scoring and management APIs.

import { NextResponse } from "next/server";

import type { ApiErrorBody } from "./dto";

/** Build the standard `{ error: { code, message, details } }` response. */
export function apiError(
  status: number,
  code: string,
  message: string,
  details: unknown[] = []
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, details } },
    { status }
  );
}

export type ReadJsonResult =
  | { ok: true; body: unknown }
  | { ok: false; response: NextResponse };

/** Read and JSON-parse a request body, enforcing a byte ceiling. */
export async function readJsonBody(
  request: Request,
  maxBytes: number
): Promise<ReadJsonResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return {
      ok: false,
      response: apiError(413, "payload_too_large", "Payload too large"),
    };
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return {
      ok: false,
      response: apiError(413, "payload_too_large", "Payload too large"),
    };
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return {
      ok: false,
      response: apiError(400, "invalid_json", "Invalid JSON body"),
    };
  }
}
