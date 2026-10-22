
import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual
} from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

export type VerifyResult =
  | {
      ok: true;
      user: TelegramUser;
    }
  | {
      ok: false;
      code: string;
    };

function compareHash(
  received: string,
  expected: Buffer
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(received)) {
    return false;
  }

  const buffer = Buffer.from(received, "hex");

  return (
    buffer.length === expected.length &&
    timingSafeEqual(buffer, expected)
  );
}

function isValidUser(
  value: unknown
): value is TelegramUser {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "number" &&
    Number.isSafeInteger(user.id) &&
    user.id > 0 &&
    typeof user.first_name === "string" &&
    user.first_name.length > 0 &&
    user.first_name.length <= 256 &&
    (
      user.username === undefined ||
      typeof user.username === "string"
    ) &&
    (
      user.last_name === undefined ||
      typeof user.last_name === "string"
    )
  );
}

export function verifyMiniApp(
  initData: unknown
): VerifyResult {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken?.trim()) {
    return {
      ok: false,
      code: "TOKEN_MISSING"
    };
  }

  if (
    typeof initData !== "string" ||
    !initData
  ) {
    return {
      ok: false,
      code: "INIT_DATA_MISSING"
    };
  }

  if (initData.length > 8192) {
    return {
      ok: false,
      code: "INIT_DATA_TOO_LARGE"
    };
  }

  try {
    const params = new URLSearchParams(initData);
    const entries = [...params.entries()];

    const keys = entries.map(([key]) => key);

    if (new Set(keys).size !== keys.length) {
      return {
        ok: false,
        code: "DUPLICATE_PARAMETER"
      };
    }

    const hash = params.get("hash") || "";
    const authDate = params.get("auth_date") || "";

    if (!/^\d+$/.test(authDate)) {
      return {
        ok: false,
        code: "INVALID_AUTH_DATE"
      };
    }

    const timestamp = Number(authDate);
    const now = Math.floor(Date.now() / 1000);

    if (
      !Number.isSafeInteger(timestamp) ||
      timestamp > now + 60 ||
      now - timestamp > 3600
    ) {
      return {
        ok: false,
        code: "AUTH_DATE_EXPIRED"
      };
    }

    const dataCheckString = entries
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
      .update(botToken)
      .digest();

    const expected = createHmac(
      "sha256",
      secret
    )
      .update(dataCheckString)
      .digest();

    if (!compareHash(hash, expected)) {
      return {
        ok: false,
        code: "INVALID_SIGNATURE"
      };
    }

    const rawUser = params.get("user");

    const parsed: unknown = rawUser
      ? JSON.parse(rawUser)
      : null;

    if (!isValidUser(parsed)) {
      return {
        ok: false,
        code: "INVALID_USER_DATA"
      };
    }

    return {
      ok: true,
      user: parsed
    };
  } catch {
    return {
      ok: false,
      code: "INVALID_INIT_DATA"
    };
  }
}

export function verifyBrowserLogin(
  payload: unknown
): VerifyResult {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken?.trim()) {
    return {
      ok: false,
      code: "TOKEN_MISSING"
    };
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return {
      ok: false,
      code: "INVALID_PAYLOAD"
    };
  }

  const data = payload as Record<string, unknown>;

  if (
    typeof data.hash !== "string" ||
    (
      typeof data.auth_date !== "number" &&
      typeof data.auth_date !== "string"
    )
  ) {
    return {
      ok: false,
      code: "INVALID_PAYLOAD"
    };
  }

  const timestamp = Number(data.auth_date);
  const now = Math.floor(Date.now() / 1000);

  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp > now + 60 ||
    now - timestamp > 3600
  ) {
    return {
      ok: false,
      code: "AUTH_DATE_EXPIRED"
    };
  }

  const entries = Object.entries(data)
    .filter(
      ([key, value]) =>
        key !== "hash" &&
        (
          typeof value === "string" ||
          typeof value === "number"
        )
    );

  const checkString = entries
    .sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = createHash("sha256")
    .update(botToken)
    .digest();

  const expected = createHmac("sha256", secret)
    .update(checkString)
    .digest();

  if (!compareHash(data.hash, expected)) {
    return {
      ok: false,
      code: "INVALID_SIGNATURE"
    };
  }

  const user: TelegramUser = {
    id: Number(data.id),
    first_name:
      typeof data.first_name === "string"
        ? data.first_name
        : "",
    last_name:
      typeof data.last_name === "string"
        ? data.last_name
        : undefined,
    username:
      typeof data.username === "string"
        ? data.username
        : undefined,
    photo_url:
      typeof data.photo_url === "string"
        ? data.photo_url
        : undefined
  };

  if (!isValidUser(user)) {
    return {
      ok: false,
      code: "INVALID_USER_DATA"
    };
  }

  return {
    ok: true,
    user
  };
}
