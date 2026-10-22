
import "server-only";

import {
  randomBytes,
  createHash
} from "node:crypto";

import { cookies } from "next/headers";
import { db, transaction } from "./db";

import type { TelegramUser } from "./telegram";

const COOKIE_NAME = "tia_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function hashToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function upsertUserAndSession(
  user: TelegramUser
): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await transaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO public.users (
        telegram_id,
        first_name,
        last_name,
        username,
        photo_url
      )
      VALUES ($1, $2, $3, $4, $5)

      ON CONFLICT (telegram_id)
      DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        photo_url = EXCLUDED.photo_url

      RETURNING id
      `,
      [
        user.id,
        user.first_name,
        user.last_name ?? null,
        user.username ?? null,
        user.photo_url ?? null
      ]
    );

    const userId = result.rows[0].id;

    await client.query(
      `
      INSERT INTO public.wallets (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );

    await client.query(
      `
      INSERT INTO public.auth_sessions (
        user_id,
        token_hash,
        expires_at
      )
      VALUES (
        $1,
        $2,
        NOW() + INTERVAL '30 days'
      )
      `,
      [userId, hashToken(token)]
    );
  });

  return token;
}

export async function setSessionCookie(
  token: string
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE
  });
}

export async function getSessionUserId():
  Promise<string | null> {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (
    !token ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return null;
  }

  const result = await db().query<{
    user_id: string;
  }>(
    `
    SELECT s.user_id
    FROM public.auth_sessions s
    JOIN public.users u
      ON u.id = s.user_id
    WHERE s.token_hash = $1
      AND s.expires_at > NOW()
      AND u.is_banned = FALSE
    LIMIT 1
    `,
    [hashToken(token)]
  );

  return result.rows[0]?.user_id ?? null;
}

export async function clearSession():
  Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await db().query(
      `
      DELETE FROM public.auth_sessions
      WHERE token_hash = $1
      `,
      [hashToken(token)]
    );
  }

  cookieStore.delete(COOKIE_NAME);
}
