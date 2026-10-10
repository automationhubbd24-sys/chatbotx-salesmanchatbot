"use server"

import { orderService } from "@chatbotx.io/business"
import { zodBigintAsString } from "@chatbotx.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { orderCustomFieldDefinitionSchema } from "../schema/action"

export const createOrderCustomFieldAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString()])
  .inputSchema(orderCustomFieldDefinitionSchema)
  .action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput }) => {
    await orderService.createCustomFieldDefinition({ workspaceId, ...parsedInput, options: parsedInput.options ?? undefined })
  })
