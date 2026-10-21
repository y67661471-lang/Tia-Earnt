
import "server-only";
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_premium?: boolean;
};

export function verifyTelegramInitData(
  initData: string
): TelegramUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (
    !token ||
    typeof initData !== "string" ||
    initData.length > 8192
  ) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const seen = new Set<string>();

    for (const key of params.keys()) {
      if (seen.has(key)) return null;
      seen.add(key);
    }

    const hash = params.get("hash");
    const authDateRaw = params.get("auth_date");
    const userRaw = params.get("user");

    if (
      !hash ||
      !/^[0-9a-f]{64}$/i.test(hash) ||
      !authDateRaw ||
      !userRaw
    ) {
      return null;
    }

    if (!/^\d+$/.test(authDateRaw)) return null;

    const authDate = Number(authDateRaw);
    const now = Math.floor(Date.now() / 1000);

    if (
      !Number.isSafeInteger(authDate) ||
      authDate > now + 60 ||
      now - authDate > 3600
    ) {
      return null;
    }

    const dataCheckString = [...params.entries()]
      .filter(([key]) => key !== "hash")
      .sort(([a], [b]) =>
        a < b ? -1 : a > b ? 1 : 0
      )
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secret = createHmac(
      "sha256",
      "WebAppData"
    )
      .update(token)
      .digest();

    const expected = createHmac("sha256", secret)
      .update(dataCheckString)
      .digest();

    const received = Buffer.from(hash, "hex");

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return null;
    }

    const user: unknown = JSON.parse(userRaw);

    if (
      !user ||
      typeof user !== "object" ||
      !("id" in user) ||
      !("first_name" in user)
    ) {
      return null;
    }

    const u = user as Record<string, unknown>;

    if (
      !Number.isSafeInteger(u.id) ||
      Number(u.id) <= 0 ||
      typeof u.first_name !== "string" ||
      u.first_name.length > 256
    ) {
      return null;
    }

    return {
      id: Number(u.id),
      first_name: u.first_name,
      last_name:
        typeof u.last_name === "string"
          ? u.last_name.slice(0, 256)
          : undefined,
      username:
        typeof u.username === "string"
          ? u.username.slice(0, 64)
          : undefined,
      photo_url:
        typeof u.photo_url === "string"
          ? u.photo_url
          : undefined,
      is_premium: u.is_premium === true,
    };
  } catch {
    return null;
  }
}
