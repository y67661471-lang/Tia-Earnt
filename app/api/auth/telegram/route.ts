
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AGE_SECONDS = 3600;

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function verifyTelegramData(
  initData: string,
  botToken: string
): TelegramUser | null {
  try {
    if (!initData || initData.length > 8192) {
      return null;
    }

    const params = new URLSearchParams(initData);

    const hashes = params.getAll("hash");
    const authDates = params.getAll("auth_date");
    const users = params.getAll("user");

    if (
      hashes.length !== 1 ||
      authDates.length !== 1 ||
      users.length !== 1
    ) {
      return null;
    }

    const receivedHash = hashes[0];

    if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
      return null;
    }

    const authDate = Number(authDates[0]);
    const now = Math.floor(Date.now() / 1000);

    if (
      !Number.isSafeInteger(authDate) ||
      authDate > now + 60 ||
      now - authDate > MAX_AGE_SECONDS
    ) {
      return null;
    }

    const seen = new Set<string>();

    for (const key of params.keys()) {
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);
    }

    const dataCheckString = [...params.entries()]
      .filter(([key]) => key !== "hash")
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = createHmac(
      "sha256",
      "WebAppData"
    )
      .update(botToken)
      .digest();

    const calculatedHash = createHmac(
      "sha256",
      secretKey
    )
      .update(dataCheckString)
      .digest();

    const providedHash = Buffer.from(
      receivedHash,
      "hex"
    );

    if (
      providedHash.length !== calculatedHash.length ||
      !timingSafeEqual(providedHash, calculatedHash)
    ) {
      return null;
    }

    const user = JSON.parse(users[0]) as TelegramUser;

    if (
      !user ||
      !Number.isSafeInteger(user.id) ||
      user.id <= 0 ||
      typeof user.first_name !== "string"
    ) {
      return null;
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name:
        typeof user.last_name === "string"
          ? user.last_name
          : undefined,
      username:
        typeof user.username === "string"
          ? user.username
          : undefined,
      language_code:
        typeof user.language_code === "string"
          ? user.language_code
          : undefined,
      photo_url:
        typeof user.photo_url === "string"
          ? user.photo_url
          : undefined,
      is_premium: user.is_premium === true,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error("Telegram bot token is missing");

      return errorResponse(
        "Server configuration error",
        503
      );
    }

    const contentType =
      request.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return errorResponse(
        "JSON request required",
        415
      );
    }

    const body = await request.json();

    if (
      !body ||
      typeof body.initData !== "string"
    ) {
      return errorResponse(
        "Invalid Telegram login data",
        400
      );
    }

    const user = verifyTelegramData(
      body.initData,
      botToken
    );

    if (!user) {
      return errorResponse(
        "Telegram verification failed",
        401
      );
    }

    return NextResponse.json(
      {
        success: true,
        verified: true,
        user,
        message: "Telegram identity verified",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return errorResponse(
      "Authentication request failed",
      400
    );
  }
}

export async function GET() {
  return errorResponse(
    "Method not allowed",
    405
  );
}
