import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import bcrypt from "bcryptjs";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    // テスト用ユーザーを作成
    const passwordHash = await bcrypt.hash("password123", 10);
    
    // 既存のユーザーを確認
    const existingUser = await convex.query(api.users.getUserByEmail, { 
      email: "test@example.com" 
    });

    if (existingUser) {
      return NextResponse.json({ 
        message: "Test user already exists",
        user: { email: existingUser.email, role: existingUser.role }
      });
    }

    // 新規ユーザーを作成
    const userId = await convex.mutation(api.auth.createUser, {
      email: "test@example.com",
      name: "Test User",
      password: passwordHash,
      role: "student"
    });

    return NextResponse.json({ 
      message: "Test user created successfully",
      userId,
      credentials: {
        email: "test@example.com",
        password: "password123"
      }
    });
  } catch (error) {
    console.error("Test setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup test user", details: String(error) },
      { status: 500 }
    );
  }
} 