import {
  createEmbeddingIntegrationModel,
  testEmbeddingModel,
} from "@chatbotx.io/ai/server"
import { EMBEDDING_DIMENSIONS } from "@chatbotx.io/business"
import { AuthType, type SecretTextAuthValue } from "@chatbotx.io/sdk"

export async function validateEmbeddingProvider(input: {
  apiKey?: string
  auth?: unknown
  baseURL: string
  model: string
}) {
  const auth: unknown = input.apiKey
    ? ({
        authType: AuthType.secretText,
        secretText: input.apiKey,
      } satisfies SecretTextAuthValue)
    : input.auth

  const result = await testEmbeddingModel({
    model: createEmbeddingIntegrationModel({
      auth,
      baseURL: input.baseURL,
      model: input.model,
    }),
  })

  return {
    ...result,
    validDimensions: result.dimensions === EMBEDDING_DIMENSIONS,
  }
}
