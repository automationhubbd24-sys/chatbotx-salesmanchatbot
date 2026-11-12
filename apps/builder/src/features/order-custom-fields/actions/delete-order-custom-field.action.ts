"use server"

import { orderService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"

export const deleteOrderCustomFieldAction = workspaceActionClientAllowExpired
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(async ({ bindArgsParsedInputs: [workspaceId, id] }) => {
    await orderService.deleteCustomFieldDefinition({ workspaceId, id })
  })
