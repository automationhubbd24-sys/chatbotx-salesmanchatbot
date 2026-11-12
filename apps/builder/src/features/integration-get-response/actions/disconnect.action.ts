"use server"

import { integrationGetResponseService } from "@salesmanchatbot.io/business"
import { createDisconnectAction } from "@/lib/integration-actions"

export const disconnectGetResponseAction = createDisconnectAction(
  integrationGetResponseService,
  { name: "GetResponse" },
)
