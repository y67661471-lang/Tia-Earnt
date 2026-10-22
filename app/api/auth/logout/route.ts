
import { NextRequest } from "next/server";

import {
  allowedOrigin,
  noStoreJson
} from "@/lib/http";

import {
  clearSession
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  if (!allowedOrigin(request)) {
    return noStoreJson(
      {
        error: "ORIGIN_NOT_ALLOWED"
      },
      403
    );
  }

  try {
    await clearSession();

    return noStoreJson({
      ok: true
    });
  } catch (error) {
    console.error(
      "[Logout API]",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return noStoreJson(
      {
        error: "SERVER_ERROR"
      },
      500
    );
  }
}
