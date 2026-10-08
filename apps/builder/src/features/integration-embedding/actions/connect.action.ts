"use server"

import {
  integrationEmbeddingService,
  validateOpenaiCompatibleBaseUrlForEnvironment,
} from "@chatbotx.io/business"
import { ChatbotXException } from "@chatbotx.io/business/errors"
import { getTranslations } from "next-intl/server"
import { returnValidationErrors } from "next-safe-action"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { verifyOpenaiCompatibleProvider } from "@/features/integration-openai-compatible/lib"
import { workspaceActionClient } from "@/lib/safe-action"
import {
  type ConnectIntegrationEmbeddingSchema,
  connectIntegrationEmbeddingSchema,
} from "../schema/request"

export const connectIntegrationEmbeddingAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(connectIntegrationEmbeddingSchema)
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [workspaceId],
    }: {
      parsedInput: ConnectIntegrationEmbeddingSchema
      bindArgsParsedInputs: WorkspaceIdRequestParams
    }) => {
      const t = await getTranslations()
      let baseURL: string
      try {
        baseURL = await validateOpenaiCompatibleBaseUrlForEnvironment(
          parsedInput.baseURL,
        )
      } catch (error) {
        if (isBaseUrlValidationError(error)) {
          return returnValidationErrors(connectIntegrationEmbeddingSchema, {
            baseURL: {
              _errors: [t("embedding.validation.invalidBaseURL")],
            },
          })
        }
        throw error
      }

      const verifyResult = await verifyOpenaiCompatibleProvider({
        apiKey: parsedInput.apiKey,
        baseURL,
      })

      if (!verifyResult.ok) {
        if (verifyResult.reason === "unsafe_base_url") {
          return returnValidationErrors(connectIntegrationEmbeddingSchema, {
            baseURL: {
              _errors: [t("embedding.validation.invalidBaseURL")],
            },
          })
        }
        return returnValidationErrors(connectIntegrationEmbeddingSchema, {
          apiKey: {
            _errors: [t("validation.invalidApiKey")],
          },
        })
      }

      try {
        await integrationEmbeddingService.connect({
          workspaceId,
          ...parsedInput,
          baseURL,
        })
      } catch (error) {
        if (isBaseUrlValidationError(error)) {
          return returnValidationErrors(connectIntegrationEmbeddingSchema, {
            baseURL: {
              _errors: [t("embedding.validation.invalidBaseURL")],
            },
          })
        }
        throw error
      }
    },
  )

const isBaseUrlValidationError = (error: unknown): error is ChatbotXException =>
  error instanceof ChatbotXException &&
  (error.code === "invalidBaseUrl" || error.code === "ssrfBlocked")
