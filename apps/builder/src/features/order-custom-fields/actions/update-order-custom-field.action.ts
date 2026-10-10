"use server"

import { orderService } from "@chatbotx.io/business"
import { zodBigintAsString } from "@chatbotx.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { orderCustomFieldDefinitionSchema } from "../schema/action"

export const updateOrderCustomFieldAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(orderCustomFieldDefinitionSchema.omit({ orderType: true }))
  .action(async ({ bindArgsParsedInputs: [workspaceId, id], parsedInput }) => {
    await orderService.updateCustomFieldDefinition({ workspaceId, id, values: { ...parsedInput, options: parsedInput.options ?? undefined } })
  })
