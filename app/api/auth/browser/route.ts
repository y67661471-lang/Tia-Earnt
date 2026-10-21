
import { NextRequest, NextResponse } from "next/server";
import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { transaction } from "../../../../lib/db";
import { createSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_ORIGIN = "https://tia-earnt-pied.vercel.app";

type LoginUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function verifyLogin(value: unknown): LoginUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  const hash = data.hash;

  if (
    typeof hash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(hash) ||
    !Number.isSafeInteger(data.id) ||
    Number(data.id) <= 0 ||
    typeof data.first_name !== "string" ||
    data.first_name.length > 256 ||
    !Number.isSafeInteger(data.auth_date)
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const authDate = Number(data.auth_date);

  if (authDate > now + 60 || now - authDate > 300) {
    return null;
  }

  const allowed = new Set([
    "id",
    "first_name",
    "last_name",
    "username",
    "photo_url",
    "auth_date",
    "hash",
  ]);

  for (const [key, item] of Object.entries(data)) {
    if (!allowed.has(key)) return null;
    if (
      key !== "id" &&
      key !== "auth_date" &&
      key !== "hash" &&
      typeof item !== "string"
    ) {
      return null;
    }
    if (typeof item === "string" && item.length > 2048) {
      return null;
    }
  }

  const checkString = Object.entries(data)
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([key, item]) => `${key}=${item}`)
    .join("\n");

  const secret = createHash("sha256")
    .update(token)
    .digest();

  const expected = createHmac("sha256", secret)
    .update(checkString)
    .digest();

  const received = Buffer.from(hash, "hex");

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }

  return data as LoginUser;
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== APP_ORIGIN) {
      return fail("Origin not allowed", 403);
    }

    if (
      !request.headers
        .get("content-type")
        ?.includes("application/json")
    ) {
      return fail("JSON required", 415);
    }

    const contentLength = Number(
      request.headers.get("content-length") || "0"
    );

    if (contentLength > 8192) {
      return fail("Request too large", 413);
    }

    const body = await request.json();
    const telegramUser = verifyLogin(body);

    if (!telegramUser) {
      return fail("Telegram login verification failed", 401);
    }

    const userId = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO users
          (telegram_id, first_name, last_name,
           username, photo_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (telegram_id)
         DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           username = EXCLUDED.username,
           photo_url = EXCLUDED.photo_url,
           updated_at = NOW()
         RETURNING id, status`,
        [
          telegramUser.id,
          telegramUser.first_name,
          telegramUser.last_name ?? null,
          telegramUser.username ?? null,
          telegramUser.photo_url ?? null,
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
      { success: true, message: "Login successful" },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ACCOUNT_BLOCKED"
    ) {
      return fail("Account blocked", 403);
    }

    console.error("Browser login failed");
    return fail("Authentication failed", 500);
  }
}
