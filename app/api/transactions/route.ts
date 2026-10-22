
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
        amount::text,
        type,
        status,
        description,
        created_at
      FROM public.wallet_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    return noStoreJson({
      transactions: result.rows
    });
  } catch (error) {
    console.error(
      "[API TRANSACTIONS]",
      error instanceof Error
        ? error.message
        : "unknown"
    );

    return noStoreJson({
      error: "SERVER_ERROR"
    }, 500);
  }
}
