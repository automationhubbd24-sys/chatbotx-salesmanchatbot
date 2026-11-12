"use server"

import { aiAgentService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { updateAIAgentRequest } from "@/features/ai-agents/schema/action"
import { workspaceActionClient } from "@/lib/safe-action"

export const updateAIAgentAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateAIAgentRequest)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    } = props

    return await aiAgentService.updateAIAgent({ workspaceId, id }, parsedInput)
  })
