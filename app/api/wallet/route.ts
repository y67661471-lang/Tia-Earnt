
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
        balance::text,
        total_earned::text,
        total_withdrawn::text,
        updated_at
      FROM public.wallets
      WHERE user_id = $1
      `,
      [userId]
    );

    return noStoreJson({
      wallet: result.rows[0] ?? {
        balance: "0",
        total_earned: "0",
        total_withdrawn: "0"
      }
    });
  } catch (error) {
    console.error(
      "[API WALLET]",
      error instanceof Error
        ? error.message
        : "unknown"
    );

    return noStoreJson({
      error: "SERVER_ERROR"
    }, 500);
  }
}
