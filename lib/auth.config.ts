import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config — no Prisma, no bcrypt, no Node.js-only deps.
// Used by middleware.ts. The full config (with providers) lives in lib/auth.ts.
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [],
};
