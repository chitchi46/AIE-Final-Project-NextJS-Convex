const { ConvexHttpClient } = require("convex/browser");

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://hip-warbler-598.convex.cloud";
const client = new ConvexHttpClient(convexUrl);

async function createTestUsers() {
  console.log("Creating test users...");
  console.log("Using Convex URL:", convexUrl);
  
  try {
    // テスト教師アカウント
    console.log("\nCreating teacher account...");
    try {
      await client.action("auth:signIn", {
        provider: "password",
        params: {
          email: "teacher@example.com",
          password: "teacher123",
          name: "テスト教師",
          role: "teacher",
          flow: "signUp",
        },
      });
      console.log("✓ Created teacher account: teacher@example.com");
    } catch (error) {
      console.log("Teacher account may already exist or error:", error.message);
    }
    
    // テスト学生アカウント
    console.log("\nCreating student account...");
    try {
      await client.action("auth:signIn", {
        provider: "password",
        params: {
          email: "student@example.com",
          password: "student123",
          name: "テスト学生",
          role: "student",
          flow: "signUp",
        },
      });
      console.log("✓ Created student account: student@example.com");
    } catch (error) {
      console.log("Student account may already exist or error:", error.message);
    }
    
    console.log("\n🎉 Test user creation process completed!");
    console.log("\n📚 Available test accounts:");
    console.log("Teacher login: teacher@example.com / teacher123");
    console.log("Student login: student@example.com / student123");
    console.log("\n🌐 Access the app at: http://localhost:3000");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    console.log("\nTroubleshooting:");
    console.log("1. Make sure Convex dev server is running: npx convex dev");
    console.log("2. Check that JWT_PRIVATE_KEY is set in Convex environment");
    console.log("3. Verify the Convex URL is correct");
  }
}

createTestUsers(); 