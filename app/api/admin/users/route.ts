import { NextRequest } from "next/server";

import { allowedOrigin, noStoreJson } from "@/lib/http";
import { db, transaction } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

async function getAdminUserId(): Promise<string | null> {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) return null;

  const configuredIds = (process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value));

  if (configuredIds.length === 0) return null;

  const result = await db().query<{ id: string }>(
    `
    SELECT id::text
    FROM public.users
    WHERE id = $1
      AND telegram_id::text = ANY($2::text[])
      AND status = 'active'
    LIMIT 1
    `,
    [sessionUserId, configuredIds]
  );

  return result.rows[0]?.id ?? null;
}

export async function GET() {
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return noStoreJson({ error: "FORBIDDEN" }, 403);

    const result = await db().query(
      `
      SELECT
        u.id::text AS id,
        u.telegram_id::text AS "telegramId",
        u.first_name AS "firstName",
        u.username,
        u.status,
        u.created_at AS "createdAt",
        COALESCE(w.balance, 0)::text AS balance
      FROM public.users u
      LEFT JOIN public.wallets w ON w.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT 100
      `
    );

    return noStoreJson({ users: result.rows });
  } catch (error) {
    console.error("[ADMIN USERS GET]", error instanceof Error ? error.message : "unknown");
    return noStoreJson({ error: "SERVER_ERROR" }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  if (!allowedOrigin(request)) {
    return noStoreJson({ error: "ORIGIN_NOT_ALLOWED" }, 403);
  }

  try {
    const adminId = await getAdminUserId();
    if (!adminId) return noStoreJson({ error: "FORBIDDEN" }, 403);

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return noStoreJson({ error: "INVALID_BODY" }, 400);
    }

    const input = body as Record<string, unknown>;
    const targetId = typeof input.userId === "string" ? input.userId : "";
    const nextStatus = input.status;

    if (!/^\d+$/.test(targetId) || !["active", "blocked"].includes(String(nextStatus))) {
      return noStoreJson({ error: "INVALID_INPUT" }, 400);
    }

    if (targetId === adminId) {
      return noStoreJson({ error: "CANNOT_CHANGE_OWN_STATUS" }, 400);
    }

    const updated = await transaction(async (client) => {
      const target = await client.query<{ status: "active" | "blocked" }>(
        `
        SELECT status
        FROM public.users
        WHERE id = $1
        FOR UPDATE
        `,
        [targetId]
      );

      if (!target.rows[0]) return null;

      const previousStatus = target.rows[0].status;
      const status = nextStatus as "active" | "blocked";

      if (previousStatus === status) {
        return { id: targetId, status, unchanged: true };
      }

      await client.query(
        `
        UPDATE public.users
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        `,
        [status, targetId]
      );

      await client.query(
        `
        INSERT INTO public.admin_audit_log (
          actor_user_id,
          target_user_id,
          action,
          previous_status,
          new_status
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          adminId,
          targetId,
          status === "blocked" ? "user_blocked" : "user_unblocked",
          previousStatus,
          status
        ]
      );

      return { id: targetId, status, unchanged: false };
    });

    if (!updated) return noStoreJson({ error: "USER_NOT_FOUND" }, 404);

    return noStoreJson({ ok: true, user: updated });
  } catch (error) {
    console.error("[ADMIN USERS PATCH]", error instanceof Error ? error.message : "unknown");
    return noStoreJson({ error: "SERVER_ERROR" }, 500);
  }
}
