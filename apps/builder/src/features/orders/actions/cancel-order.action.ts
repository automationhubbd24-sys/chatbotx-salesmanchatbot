"use server"

import { orderService } from "@chatbotx.io/business"
import { workspaceIdrequestParams } from "@/features/common/schema"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"
import { orderIdRequest } from "../schema/action"

export const cancelOrderAction = workspaceActionClientAllowExpired
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(orderIdRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput }) => {
    await orderService.cancel({
      workspaceId,
      orderId: parsedInput.orderId,
      reason: "cancelled_by_workspace_user",
    })
  })
