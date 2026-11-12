import type { SmtpProvider } from "@salesmanchatbot.io/integration-smtp"
import { smtpHostMap } from "@salesmanchatbot.io/integration-smtp"

/**
 * Resolves the effective host/port for a provider. Anything but "other" is
 * pinned to the provider's known host/port (ignoring any host/port the
 * caller supplied); "other" passes the caller-supplied values through.
 */
export function resolveSmtpHostAndPort(
  provider: SmtpProvider,
  fallback: { host: string; port: number },
): { host: string; port: number } {
  if (provider === "other") {
    return fallback
  }
  return smtpHostMap[provider]
}
