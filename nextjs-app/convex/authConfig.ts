import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      id: "password",
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
          role: (params.role as "student" | "teacher" | "admin") || "student",
        };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // 既存のユーザーがいる場合はそのIDを返す
      if (args.existingUserId) {
        return args.existingUserId;
      }
      
      // プロファイルから必要な情報を取得
      const { email, name, role } = args.profile;
      
      // 新規ユーザーを作成
      const userId = await ctx.db.insert("users", {
        email: email as string,
        name: name as string,
        role: (role as "student" | "teacher" | "admin") || "student",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return userId;
    },
  },
}); 