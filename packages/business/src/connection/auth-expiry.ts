import type { AuthValue } from "@salesmanchatbot.io/sdk"

export const authExpiresAtOf = (auth: AuthValue): Date | null =>
  auth.authType === "oauth2" && auth.tokens.expiresAt
    ? new Date(auth.tokens.expiresAt)
    : null
