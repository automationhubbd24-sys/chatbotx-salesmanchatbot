"use server"

import { orderService } from "@chatbotx.io/business"
import { workspaceIdrequestParams } from "@/features/common/schema"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"
import { confirmOrderRequest } from "../schema/action"

export const confirmOrderAction = workspaceActionClientAllowExpired
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(confirmOrderRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput }) => {
    await orderService.confirm({
      workspaceId,
      orderId: parsedInput.orderId,
      token: parsedInput.token,
      version: parsedInput.version,
      idempotencyKey: parsedInput.idempotencyKey,
    })
  })
