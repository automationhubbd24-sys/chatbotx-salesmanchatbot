import { getIdFromParams } from "@chatbotx.io/utils"
import { notFound } from "next/navigation"
import { EmbeddingConnect } from "@/features/integration-embedding/embedding-connect"
import { findIntegrationEmbedding } from "@/features/integration-embedding/queries"

export default async function SettingsIntegrationEmbeddingPage(props: {
  params: Promise<{ workspaceId: string }>
}) {
  const workspaceId = getIdFromParams(await props.params, "workspaceId")
  if (!workspaceId) {
    return notFound()
  }

  const promises = Promise.all([findIntegrationEmbedding({ workspaceId })])

  return <EmbeddingConnect promises={promises} />
}
