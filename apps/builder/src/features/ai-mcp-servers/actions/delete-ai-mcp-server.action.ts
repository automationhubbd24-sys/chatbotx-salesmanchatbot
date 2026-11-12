"use server"

import { aiMcpServerService } from "@salesmanchatbot.io/business"
import { notFoundException } from "@salesmanchatbot.io/business/errors"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { getTranslations } from "next-intl/server"
import { workspaceActionClient } from "@/lib/safe-action"

export const deleteAIMcpServerAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action((props) => {
    const {
      bindArgsParsedInputs: [workspaceId, aiMcpServerId],
    } = props

    return deleteAIMcpServer({ workspaceId, aiMcpServerId })
  })

export const deleteAIMcpServer = async (ctx: {
  workspaceId: string
  aiMcpServerId: string
}) => {
  const t = await getTranslations()

  const mcpServer = await aiMcpServerService.findBy({
    where: {
      id: ctx.aiMcpServerId,
      workspaceId: ctx.workspaceId,
    },
  })
  if (!mcpServer) {
    throw notFoundException(
      t("messages.featureNotFound", { feature: t("fields.mcpServer.label") }),
    )
  }

  await aiMcpServerService.delete({
    workspaceId: ctx.workspaceId,
    id: ctx.aiMcpServerId,
  })
}
