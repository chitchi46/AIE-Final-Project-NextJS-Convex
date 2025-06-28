import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://hip-warbler-598.convex.cloud";
const client = new ConvexHttpClient(convexUrl);

async function createTestUsers() {
  console.log("Creating test users...");
  
  try {
    // テスト教師アカウント
    await client.action(api.auth.signIn, {
      provider: "password",
      params: {
        email: "teacher@example.com",
        password: "teacher123",
        name: "テスト教師",
        role: "teacher",
        flow: "signUp",
      },
    });
    console.log("Created teacher account: teacher@example.com");
    
    // テスト学生アカウント
    await client.action(api.auth.signIn, {
      provider: "password",
      params: {
        email: "student@example.com",
        password: "student123",
        name: "テスト学生",
        role: "student",
        flow: "signUp",
      },
    });
    console.log("Created student account: student@example.com");
    
    console.log("\nTest users created successfully!");
    console.log("Teacher login: teacher@example.com / teacher123");
    console.log("Student login: student@example.com / student123");
  } catch (error) {
    console.error("Error creating test users:", error);
  }
}

createTestUsers(); 