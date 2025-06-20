import { NextResponse } from "next/server";

export async function GET() {
  // This route is now deprecated in favor of /api/chats/[userId]
  // Return empty array as fallback
  return NextResponse.json([]);
}
