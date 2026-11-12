"use server"

import { aiFileService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { getTranslations } from "next-intl/server"
import { workspaceIdrequestParams } from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"
import { createAIFileRequest } from "../schema"

export const createAIFileAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(createAIFileRequest)
  .action(async ({ bindArgsParsedInputs, parsedInput }) => {
    const [workspaceId] = bindArgsParsedInputs

    try {
      await aiFileService.create(workspaceId, parsedInput)
    } catch (error) {
      if (
        error instanceof salesmanChatbotException &&
        error.code === "noEmbeddingProvider"
      ) {
        const t = await getTranslations("aiFiles")
        throw new salesmanChatbotException(t("noEmbeddingProvider"))
      }
      throw error
    }
  })
