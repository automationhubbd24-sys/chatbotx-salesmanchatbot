"use server"

import { randomUUID } from "node:crypto"
import { orderService } from "@chatbotx.io/business"
import { workspaceIdrequestParams } from "@/features/common/schema"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"
import { orderIdRequest } from "../schema/action"

export const requestOrderConfirmationAction = workspaceActionClientAllowExpired
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(orderIdRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput }) => {
    await orderService.requestConfirmation({
      workspaceId,
      orderId: parsedInput.orderId,
      token: randomUUID(),
    })
  })
