import NextAuth from "next-auth"
import authConfig from "./auth.config"

// Credentials + JWT sessions only, so no database adapter is needed.
export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig)
