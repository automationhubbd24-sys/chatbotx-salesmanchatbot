import { getIdFromParams } from "@chatbotx.io/utils"
import { notFound } from "next/navigation"
import { OpenaiCompatibleEmbeddingManage } from "@/features/integration-openai-compatible-embedding/openai-compatible-embedding-manage"
import { findIntegrationOpenaiCompatibleEmbedding } from "@/features/integration-openai-compatible-embedding/queries"

export default async function SettingsOpenaiCompatibleTextEmbeddingPage(props: {
  params: Promise<{ workspaceId: string }>
}) {
  const workspaceId = getIdFromParams(await props.params, "workspaceId")
  if (!workspaceId) {
    return notFound()
  }

  const promises = Promise.all([
    findIntegrationOpenaiCompatibleEmbedding({ workspaceId }),
  ])

  return <OpenaiCompatibleEmbeddingManage promises={promises} />
}
