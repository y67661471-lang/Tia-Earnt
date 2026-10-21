
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "../../../../lib/telegram";
import { createSession } from "../../../../lib/session";
import { transaction } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;

    if (
      !expectedOrigin ||
      !origin ||
      origin !== new URL(expectedOrigin).origin
    ) {
      return NextResponse.json(
        { success: false, message: "Origin not allowed" },
        { status: 403 }
      );
    }

    if (
      !request.headers
        .get("content-type")
        ?.includes("application/json")
    ) {
      return NextResponse.json(
        { success: false, message: "JSON required" },
        { status: 415 }
      );
    }

    const body = await request.json();

    const user = verifyTelegramInitData(
      body?.initData
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Telegram verification failed",
        },
        { status: 401 }
      );
    }

    const dbUserId = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO users
          (telegram_id, first_name, last_name,
           username, photo_url, is_premium)
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
          user.id,
          user.first_name,
          user.last_name ?? null,
          user.username ?? null,
          user.photo_url ?? null,
          user.is_premium ?? false,
        ]
      );

      const dbUser = result.rows[0];

      if (dbUser.status !== "active") {
        throw new Error("ACCOUNT_BLOCKED");
      }

      await client.query(
        `INSERT INTO wallets (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [dbUser.id]
      );

      return String(dbUser.id);
    });

    await createSession(dbUserId);

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          telegram_id: user.id,
          first_name: user.first_name,
          username: user.username ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ACCOUNT_BLOCKED"
    ) {
      return NextResponse.json(
        { success: false, message: "Account blocked" },
        { status: 403 }
      );
    }

    console.error("Authentication failed");

    return NextResponse.json(
      { success: false, message: "Login failed" },
      { status: 500 }
    );
  }
}
