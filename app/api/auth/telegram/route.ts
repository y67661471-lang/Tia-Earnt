
import { NextRequest } from "next/server";

import {
  allowedOrigin,
  noStoreJson
} from "@/lib/http";

import { verifyMiniApp } from "@/lib/telegram";

import {
  setSessionCookie,
  upsertUserAndSession
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  if (!allowedOrigin(request)) {
    return noStoreJson({
      error: "ORIGIN_NOT_ALLOWED"
    }, 403);
  }

  try {
    const body = await request.json();

    const result = verifyMiniApp(body?.initData);

    if (!result.ok) {
      console.warn(
        "[Telegram Auth] Verification failed:",
        result.code
      );

      return noStoreJson({
        error: "TELEGRAM_VERIFICATION_FAILED",
        code: result.code
      }, 401);
    }

    const token = await upsertUserAndSession(
      result.user
    );

    await setSessionCookie(token);

    return noStoreJson({
      ok: true
    });
  } catch (error) {
    console.error(
      "[Telegram Auth] Server error:",
      error instanceof Error
        ? error.message
        : "unknown"
    );

    return noStoreJson({
      error: "SERVER_ERROR"
    }, 500);
  }
}
