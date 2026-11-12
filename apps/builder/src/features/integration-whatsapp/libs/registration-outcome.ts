import type { RegistrationOutcome } from "@salesmanchatbot.io/business"
import type { RegisterPhoneNumberResult } from "@salesmanchatbot.io/integration-whatsapp"

export const toRegistrationOutcome = (
  result: RegisterPhoneNumberResult,
): RegistrationOutcome => {
  switch (result.status) {
    case "registered":
      return { status: "registered" }
    case "verification_required":
      return { status: "pending_verification", error: result.error }
    case "failed":
      return { status: "failed", error: result.error }
    default: {
      const _exhaustive: never = result
      return _exhaustive
    }
  }
}
