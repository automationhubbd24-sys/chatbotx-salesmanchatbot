"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { DisconnectIntegrationDialog } from "@/features/common/components/disconnect-integration-dialog"
import { useWorkspaceId } from "@/hooks/routing"
import { disconnectOpenaiCompatibleEmbeddingAction } from "./actions/disconnect.action"

export const OpenaiCompatibleEmbeddingDisconnectDialog = () => {
  const [open, setOpen] = useState(false)
  const workspaceId = useWorkspaceId()
  const router = useRouter()
  const t = useTranslations()

  const { execute, isPending } = useAction(
    disconnectOpenaiCompatibleEmbeddingAction.bind(null, workspaceId),
    {
      onSuccess: () => {
        setOpen(false)
        router.refresh()
      },
    },
  )

  return (
    <DisconnectIntegrationDialog
      featureLabel={t("openaiCompatibleTextEmbedding.title")}
      isPending={isPending}
      onConfirm={() => execute()}
      onOpenChange={setOpen}
      open={open}
    />
  )
}
