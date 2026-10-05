import type { NextAuthConfig } from "next-auth"
import { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "./lib/prisma"
import { loginSchema } from "./lib/auth-schemas"
import { clientIp, rateLimit, resetRateLimit } from "./lib/rate-limit"

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES_PER_EMAIL = 5
const MAX_ATTEMPTS_PER_IP = 30

/** Surfaces as `code: "rate_limited"` from signIn() on the client. */
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited"
}

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = "$2b$10$EFoYfGHk5679NntmKwKW6u6hvxgIUKvyZ6ZuNLveFkoafXmrM5Ore"

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data

        const ip = clientIp(request.headers)
        const emailKey = `login:email:${email}`
        if (!(await rateLimit(`login:ip:${ip}`, MAX_ATTEMPTS_PER_IP, WINDOW_MS)).ok) throw new RateLimitedError()
        if (!(await rateLimit(emailKey, MAX_FAILURES_PER_EMAIL, WINDOW_MS)).ok) throw new RateLimitedError()

        const user = await prisma.user.findUnique({ where: { email } })
        const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)
        if (!user || !isPasswordValid) return null

        resetRateLimit(emailKey)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // We will handle localization routes, so the pathname might be /id/login or /en/login
      const pathname = nextUrl.pathname;
      const isAuthRoute = pathname.includes('/login') || pathname.includes('/register');

      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        let callbackUrl = pathname;
        if (nextUrl.search) callbackUrl += nextUrl.search;

        return Response.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl));
      }

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  session: { strategy: "jwt" }
} satisfies NextAuthConfig
