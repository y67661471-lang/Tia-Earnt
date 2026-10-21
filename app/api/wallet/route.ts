
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { getPool } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const result = await getPool().query(
      `SELECT
         balance,
         total_earned,
         total_withdrawn
       FROM wallets
       WHERE user_id = $1`,
      [user.id]
    );

    if (result.rowCount !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Wallet not found",
        },
        { status: 404 }
      );
    }

    const wallet = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        wallet: {
          balance: String(wallet.balance),
          totalEarned: String(wallet.total_earned),
          totalWithdrawn: String(wallet.total_withdrawn),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load wallet",
      },
      { status: 500 }
    );
  }
}
