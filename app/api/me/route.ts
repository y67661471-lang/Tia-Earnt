
import { noStoreJson } from "@/lib/http";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return noStoreJson({
        error: "UNAUTHORIZED"
      }, 401);
    }

    const result = await db().query(
      `
      SELECT
        id::text,
        telegram_id::text,
        first_name,
        last_name,
        username,
        photo_url,
        referral_code,
        role,
        created_at
      FROM public.users
      WHERE id = $1
      `,
      [userId]
    );

    if (!result.rows[0]) {
      return noStoreJson({
        error: "NOT_FOUND"
      }, 404);
    }

    return noStoreJson({
      user: result.rows[0]
    });
  } catch (error) {
    console.error(
      "[API ME]",
      error instanceof Error
        ? error.message
        : "unknown"
    );

    return noStoreJson({
      error: "SERVER_ERROR"
    }, 500);
  }
}
