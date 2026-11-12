import { integrationApiRepository } from "@salesmanchatbot.io/database/repositories"
import type { IntegrationApiModel } from "@salesmanchatbot.io/database/types"

/** Auth-path lookup — no user session, called from the bearer-token middleware. */
export const findIntegrationApiByTokenHash = async ({
  tokenHash,
}: {
  tokenHash: string
}): Promise<IntegrationApiModel | null> =>
  await integrationApiRepository.findByTokenHash(tokenHash)
