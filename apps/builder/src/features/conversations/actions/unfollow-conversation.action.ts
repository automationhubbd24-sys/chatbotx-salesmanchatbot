"use server"

import { conversationService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"

export const unfollowConversationAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      ctx,
    } = props

    await conversationService.setFollowed({
      workspaceId,
      id,
      followed: false,
      userId: ctx.user.id,
      triggerContext: {
        triggerSource: "api",
        triggerHandler: "unfollowConversationAction",
        triggerType: "conversation_unfollowed",
      },
    })
  })
