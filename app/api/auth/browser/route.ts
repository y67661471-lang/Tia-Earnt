
import { NextRequest } from "next/server";

import {
  allowedOrigin,
  noStoreJson
} from "@/lib/http";

import {
  verifyBrowserLogin
} from "@/lib/telegram";

import {
  setSessionCookie,
  upsertUserAndSession
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  // Verify the request origin
  if (!allowedOrigin(request)) {
    return noStoreJson(
      {
        error: "ORIGIN_NOT_ALLOWED"
      },
      403
    );
  }

  try {
    // Receive Telegram Login Widget data
    const payload = await request.json();

    // Verify Telegram signature
    const result = verifyBrowserLogin(payload);

    if (!result.ok) {
      console.warn(
        "[Browser Auth] Verification failed:",
        result.code
      );

      return noStoreJson(
        {
          error: "BROWSER_VERIFICATION_FAILED",
          code: result.code
        },
        401
      );
    }

    // Create or update user in Supabase
    // and generate a secure session
    const token = await upsertUserAndSession(
      result.user
    );

    // Store session in HttpOnly cookie
    await setSessionCookie(token);

    return noStoreJson({
      ok: true,
      message: "Login successful"
    });
  } catch (error) {
    console.error(
      "[Browser Auth] Server error:",
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
