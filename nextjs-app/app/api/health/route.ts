import { NextResponse } from "next/server";

export async function GET() {
  const JWT_SECRET = process.env.JWT_SECRET;
  
  return NextResponse.json({
    status: "ok",
    environment: {
      JWT_SECRET_configured: !!JWT_SECRET,
      JWT_SECRET_length: JWT_SECRET ? JWT_SECRET.length : 0,
      JWT_SECRET_valid: JWT_SECRET && JWT_SECRET.length >= 32,
      CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      NODE_ENV: process.env.NODE_ENV
    },
    timestamp: new Date().toISOString()
  });
} 