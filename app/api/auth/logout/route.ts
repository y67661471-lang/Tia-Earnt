
import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "../../../../lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (
    !appUrl ||
    !origin ||
    origin !== new URL(appUrl).origin
  ) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    await revokeSession();

    return NextResponse.json({
      success: true,
      message: "Logged out",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
    );
  }
}
