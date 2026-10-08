"use server"

import { aiAgentService } from "@chatbotx.io/business"
import { zodBigintAsString } from "@chatbotx.io/utils"
import { updateAIAgentRequest } from "@/features/ai-agents/schema/action"
import { expandEcommerceToolsForSave } from "@/features/ai-tools/lib/ecommerce-tool"
import { workspaceActionClient } from "@/lib/safe-action"

export const updateAIAgentAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateAIAgentRequest)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    } = props

    return await aiAgentService.updateAIAgent(
      { workspaceId, id },
      {
        ...parsedInput,
        ...(parsedInput.tools === undefined
          ? {}
          : { tools: expandEcommerceToolsForSave(parsedInput.tools) }),
      },
    )
  })
