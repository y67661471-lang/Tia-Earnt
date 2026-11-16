import { noStoreJson } from "@/lib/http";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return noStoreJson({ error: "UNAUTHORIZED" }, 401);
    }

    const result = await db().query<{
      referral_code: string | null;
      registered: string;
      qualified: string;
      rewarded: string;
    }>(
      `
      SELECT
        u.referral_code,
        COUNT(r.id) FILTER (WHERE r.status = 'registered')::text AS registered,
        COUNT(r.id) FILTER (WHERE r.status = 'qualified')::text AS qualified,
        COUNT(r.id) FILTER (WHERE r.status = 'rewarded')::text AS rewarded
      FROM public.users u
      LEFT JOIN public.referrals r
        ON r.referrer_user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.referral_code
      `,
      [userId]
    );

    const referral = result.rows[0];

    if (!referral?.referral_code) {
      return noStoreJson({ error: "REFERRAL_NOT_INITIALIZED" }, 409);
    }

    return noStoreJson({
      referral: {
        code: referral.referral_code,
        registered: referral.registered,
        qualified: referral.qualified,
        rewarded: referral.rewarded
      }
    });
  } catch (error) {
    console.error(
      "[API REFERRALS]",
      error instanceof Error ? error.message : "unknown"
    );

    return noStoreJson({ error: "SERVER_ERROR" }, 500);
  }
}
