
import {
  NextRequest,
  NextResponse
} from "next/server";

export function allowedOrigin(
  request: NextRequest
): boolean {
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_APP_URL;

  if (!origin || !expected) {
    return false;
  }

  try {
    return (
      new URL(origin).origin ===
      new URL(expected).origin
    );
  } catch {
    return false;
  }
}

export function noStoreJson(
  data: unknown,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
