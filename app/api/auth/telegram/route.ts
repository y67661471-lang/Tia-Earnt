
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "../../../../lib/telegram";
import { createSession } from "../../../../lib/session";
import { transaction } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = "https://tia-earnt-pied.vercel.app";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");

    if (origin !== new URL(APP_URL).origin) {
      return jsonError("Origin not allowed", 403);
    }

    const contentType =
      request.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return jsonError("JSON required", 415);
    }

    const body = await request.json();

    if (
      !body ||
      typeof body.initData !== "string"
    ) {
      return jsonError("Invalid login request", 400);
    }

    const telegramUser = verifyTelegramInitData(
      body.initData
    );

    if (!telegramUser) {
      return jsonError(
        "Telegram verification failed",
        401
      );
    }

    const userId = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO users (
          telegram_id,
          first_name,
          last_name,
          username,
          photo_url,
          is_premium
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (telegram_id)
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          username = EXCLUDED.username,
          photo_url = EXCLUDED.photo_url,
          is_premium = EXCLUDED.is_premium,
          updated_at = NOW()
        RETURNING id, status`,
        [
          telegramUser.id,
          telegramUser.first_name,
          telegramUser.last_name ?? null,
          telegramUser.username ?? null,
          telegramUser.photo_url ?? null,
          telegramUser.is_premium ?? false,
        ]
      );

      const user = result.rows[0];

      if (user.status !== "active") {
        throw new Error("ACCOUNT_BLOCKED");
      }

      await client.query(
        `INSERT INTO wallets (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );

      return String(user.id);
    });

    await createSession(userId);

    return NextResponse.json(
      {
        success: true,
        verified: true,
        message: "Login successful",
        user: {
          telegramId: String(telegramUser.id),
          firstName: telegramUser.first_name,
          username: telegramUser.username ?? null,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ACCOUNT_BLOCKED"
    ) {
      return jsonError("Account blocked", 403);
    }

    console.error("Telegram authentication error");

    return jsonError("Authentication failed", 500);
  }
}
