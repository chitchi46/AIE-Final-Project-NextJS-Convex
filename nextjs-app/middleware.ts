import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 認証が必要なパス
const protectedPaths = [
  "/dashboard",
  "/lecture",
  "/lectures",
  "/quiz",
  "/student",
  "/teacher",
  "/analytics",
  "/live",
];

// 公開パス（認証不要）
const publicPaths = [
  "/",
  "/login",
  "/register",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはスキップ
  if (publicPaths.some((path) => pathname === path)) {
    return NextResponse.next();
    }

  // 保護されたパスの場合、認証はクライアントサイドで処理
  // Convex Authはクライアントサイドで動作するため、
  // ミドルウェアでは単純なリダイレクトのみ行う
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
}; 