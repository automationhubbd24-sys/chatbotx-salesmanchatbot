"use server"

import { integrationSmtpService, workspaceService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"

export const deleteSmtpAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
    } = props

    const [integration, workspace] = await Promise.all([
      integrationSmtpService.findByIdForWorkspace({ id, workspaceId }),
      workspaceService.findById({ id: workspaceId }),
    ])

    await integrationSmtpService.disconnect({
      workspaceId,
      id: integration.id,
      inboxId: integration.inboxId,
      ownerId: workspace.ownerId,
    })
  })
