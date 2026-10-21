
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

export type TelegramVerifyError =
  | "TOKEN_MISSING"
  | "INIT_DATA_MISSING"
  | "INIT_DATA_TOO_LARGE"
  | "DUPLICATE_PARAMETER"
  | "HASH_MISSING"
  | "INVALID_AUTH_DATE"
  | "AUTH_DATE_EXPIRED"
  | "INVALID_SIGNATURE"
  | "INVALID_USER_DATA";

export type TelegramVerifyResult =
  | {
      success: true;
      user: TelegramUser;
    }
  | {
      success: false;
      reason: TelegramVerifyError;
    };

const MAX_AUTH_AGE = 3600;
const MAX_INIT_DATA_LENGTH = 8192;

export function verifyTelegramDetailed(
  initData: unknown
): TelegramVerifyResult {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || !botToken.trim()) {
    return {
      success: false,
      reason: "TOKEN_MISSING",
    };
  }

  if (
    typeof initData !== "string" ||
    initData.length === 0
  ) {
    return {
      success: false,
      reason: "INIT_DATA_MISSING",
    };
  }

  if (initData.length > MAX_INIT_DATA_LENGTH) {
    return {
      success: false,
      reason: "INIT_DATA_TOO_LARGE",
    };
  }

  try {
    const params = new URLSearchParams(initData);
    const seen = new Set<string>();

    for (const [key] of params.entries()) {
      if (seen.has(key)) {
        return {
          success: false,
          reason: "DUPLICATE_PARAMETER",
        };
      }

      seen.add(key);
    }

    const hash = params.get("hash");

    if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) {
      return {
        success: false,
        reason: "HASH_MISSING",
      };
    }

    const authDateString = params.get("auth_date");

    if (
      !authDateString ||
      !/^\d+$/.test(authDateString)
    ) {
      return {
        success: false,
        reason: "INVALID_AUTH_DATE",
      };
    }

    const authDate = Number(authDateString);
    const now = Math.floor(Date.now() / 1000);

    if (!Number.isSafeInteger(authDate)) {
      return {
        success: false,
        reason: "INVALID_AUTH_DATE",
      };
    }

    if (
      authDate > now + 60 ||
      now - authDate > MAX_AUTH_AGE
    ) {
      return {
        success: false,
        reason: "AUTH_DATE_EXPIRED",
      };
    }

    const dataCheckString = Array.from(
      params.entries()
    )
      .filter(([key]) => key !== "hash")
      .sort(([a], [b]) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      })
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Official Telegram Mini App secret key
    const secretKey = createHmac(
      "sha256",
      "WebAppData"
    )
      .update(botToken)
      .digest();

    const expectedHash = createHmac(
      "sha256",
      secretKey
    )
      .update(dataCheckString)
      .digest();

    const receivedHash = Buffer.from(
      hash,
      "hex"
    );

    if (
      receivedHash.length !== expectedHash.length ||
      !timingSafeEqual(
        receivedHash,
        expectedHash
      )
    ) {
      return {
        success: false,
        reason: "INVALID_SIGNATURE",
      };
    }

    const rawUser = params.get("user");

    if (!rawUser) {
      return {
        success: false,
        reason: "INVALID_USER_DATA",
      };
    }

    const parsed: unknown = JSON.parse(rawUser);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {
        success: false,
        reason: "INVALID_USER_DATA",
      };
    }

    const user = parsed as Record<string, unknown>;

    if (
      !Number.isSafeInteger(user.id) ||
      Number(user.id) <= 0 ||
      typeof user.first_name !== "string" ||
      user.first_name.length === 0 ||
      user.first_name.length > 256
    ) {
      return {
        success: false,
        reason: "INVALID_USER_DATA",
      };
    }

    return {
      success: true,
      user: {
        id: Number(user.id),
        first_name: user.first_name,
        last_name:
          typeof user.last_name === "string"
            ? user.last_name.slice(0, 256)
            : undefined,
        username:
          typeof user.username === "string"
            ? user.username.slice(0, 64)
            : undefined,
        photo_url:
          typeof user.photo_url === "string" &&
          user.photo_url.length <= 2048
            ? user.photo_url
            : undefined,
        is_premium: user.is_premium === true,
      },
    };
  } catch {
    return {
      success: false,
      reason: "INVALID_USER_DATA",
    };
  }
}

// Compatible with the existing auth route.
export function verifyTelegramInitData(
  initData: unknown
): TelegramUser | null {
  const result = verifyTelegramDetailed(initData);

  if (!result.success) {
    console.warn(
      "[Telegram Auth] Verification failed:",
      result.reason
    );

    return null;
  }

  return result.user;
}
