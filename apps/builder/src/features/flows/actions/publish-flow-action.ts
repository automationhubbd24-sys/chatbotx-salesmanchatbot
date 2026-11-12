"use server"

import { flowVersionService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { publishFlowSchema } from "../schema/action"

export const publishFlowAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(publishFlowSchema)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    } = props

    await flowVersionService.publish({
      workspaceId,
      flowId: id,
      nodes: parsedInput.nodes,
      edges: parsedInput.edges,
    })
  })
