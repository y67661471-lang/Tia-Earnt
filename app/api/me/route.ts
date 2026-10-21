
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Login required",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: String(user.id),
          telegramId: String(user.telegram_id),
          firstName: user.first_name,
          lastName: user.last_name ?? "",
          username: user.username ?? "",
          photoUrl: user.photo_url ?? "",
          status: user.status,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load profile",
      },
      { status: 500 }
    );
  }
}
