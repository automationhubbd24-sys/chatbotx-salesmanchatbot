"use server"

import {
  createEmbeddingIntegrationModel,
  testEmbeddingModel,
} from "@chatbotx.io/ai/server"
import {
  EMBEDDING_DIMENSIONS,
  integrationEmbeddingService,
} from "@chatbotx.io/business"
import { getTranslations } from "next-intl/server"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"

export const testIntegrationEmbeddingAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
    }) => {
      const t = await getTranslations()
      const integration = await integrationEmbeddingService.findByWorkspaceId(
        workspaceId,
      )

      if (!integration?.enabled) {
        throw new Error(t("embedding.test.notConfigured"))
      }

      let result: Awaited<ReturnType<typeof testEmbeddingModel>>
      try {
        result = await testEmbeddingModel({
          model: createEmbeddingIntegrationModel({
            auth: integration.auth,
            baseURL: integration.baseURL,
            model: integration.model,
          }),
        })
      } catch {
        throw new Error(t("embedding.test.failed"))
      }

      if (result.dimensions !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          t("embedding.validation.dimensionMismatch", {
            actual: result.dimensions,
            expected: EMBEDDING_DIMENSIONS,
          }),
        )
      }

      return result
    },
  )
