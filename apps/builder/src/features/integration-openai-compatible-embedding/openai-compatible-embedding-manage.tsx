"use client"

import { useTranslations } from "next-intl"
import { use } from "react"
import { SettingRow } from "@/components/setting-row"
import type { findIntegrationOpenaiCompatibleEmbedding } from "./queries"
import { OpenaiCompatibleEmbeddingConnectDialog } from "./openai-compatible-embedding-connect-dialog"
import { OpenaiCompatibleEmbeddingDisconnectDialog } from "./openai-compatible-embedding-disconnect-dialog"

type OpenaiCompatibleEmbeddingManageProps = {
  promises: Promise<
    [Awaited<ReturnType<typeof findIntegrationOpenaiCompatibleEmbedding>>]
  >
}

export const OpenaiCompatibleEmbeddingManage = ({
  promises,
}: OpenaiCompatibleEmbeddingManageProps) => {
  const [integration] = use(promises)
  const t = useTranslations()

  return (
    <SettingRow
      description={t("openaiCompatibleTextEmbedding.connect.description")}
      label={t("openaiCompatibleTextEmbedding.title")}
    >
      {integration ? (
        <div className="flex gap-2">
          <OpenaiCompatibleEmbeddingConnectDialog integration={integration} />
          <OpenaiCompatibleEmbeddingDisconnectDialog />
        </div>
      ) : (
        <OpenaiCompatibleEmbeddingConnectDialog />
      )}
    </SettingRow>
  )
}
