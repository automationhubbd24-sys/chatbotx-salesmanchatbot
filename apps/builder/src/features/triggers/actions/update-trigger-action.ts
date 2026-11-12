"use server"

import { triggerService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { updateTriggerSchema } from "../schema/mutation"

export const updateTriggerAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateTriggerSchema)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    } = props
    const { conditions, actions } = parsedInput

    // `toConditionColumnsShared` inside `updateWithConditions` already
    // normalizes each condition's columns (`?? null` defaults) — mapping
    // again here was dead work now that the service owns it.
    return await triggerService.updateWithConditions({
      workspaceId,
      id,
      actions,
      conditions,
    })
  })
