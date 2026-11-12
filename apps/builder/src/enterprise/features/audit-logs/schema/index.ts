import type { AuditLogModel } from "@salesmanchatbot.io/database/types"
import type { UserResource } from "@/features/users/schema/resource"

export type AuditLogResource = AuditLogModel & {
  user?: UserResource | null
}
