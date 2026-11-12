"use server"

import { webhookService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { updateWebhookSettingsRequest } from "../schema/update-webhook-schema"

export const updateWebhookSettingsAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateWebhookSettingsRequest)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    } = props

    await webhookService.updateSettings({
      workspaceId,
      id,
      ...parsedInput,
    })
  })
