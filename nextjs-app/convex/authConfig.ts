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
}); 