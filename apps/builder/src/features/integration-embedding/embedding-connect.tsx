"use client"

import { Badge } from "@chatbotx.io/ui/components/ui/badge"
import { Switch } from "@chatbotx.io/ui/components/ui/switch"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAction } from "next-safe-action/hooks"
import { use } from "react"
import { SettingRow } from "@/components/setting-row"
import { useWorkspaceId } from "@/hooks/routing"
import { updateIntegrationEmbeddingAction } from "./actions/update.action"
import { EmbeddingConnectDialog } from "./embedding-connect-dialog"
import { EmbeddingDisconnectDialog } from "./embedding-disconnect-dialog"
import { EmbeddingEditDialog } from "./embedding-edit-dialog"
import type { findIntegrationEmbedding } from "./queries"

export function EmbeddingConnect({
  promises,
}: {
  promises: Promise<[Awaited<ReturnType<typeof findIntegrationEmbedding>>]>
}) {
  const [integration] = use(promises)
  const workspaceId = useWorkspaceId()
  const router = useRouter()
  const t = useTranslations()

  const { execute, isPending } = useAction(
    updateIntegrationEmbeddingAction.bind(null, workspaceId),
    {
      onSuccess: () => {
        router.refresh()
      },
    },
  )

  return (
    <div className="flex flex-col gap-4">
      <SettingRow
        description={t("embedding.connect.description")}
        label={t("embedding.connect.label")}
      >
        {integration ? <EmbeddingDisconnectDialog /> : <EmbeddingConnectDialog />}
      </SettingRow>

      {integration ? (
        <SettingRow
          description={`${integration.baseURL} · ${t("embedding.dimensions")}`}
          label={integration.model}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge variant={integration.enabled ? "default" : "secondary"}>
              {integration.enabled
                ? t("embedding.status.enabled")
                : t("embedding.status.disabled")}
            </Badge>
            <div className="flex items-center gap-2 text-sm">
              <span>{t("embedding.fields.enabled")}</span>
              <Switch
                aria-label={t("embedding.fields.enabled")}
                checked={integration.enabled}
                disabled={isPending}
                onCheckedChange={(enabled) => execute({ enabled })}
              />
            </div>
            <div className="flex size-4 shrink-0 items-center justify-center">
              {isPending && <Loader2Icon className="size-4 animate-spin" />}
            </div>
            <EmbeddingEditDialog integration={integration} />
          </div>
        </SettingRow>
      ) : (
        <div className="text-muted-foreground text-sm">
          {t("embedding.empty")}
        </div>
      )}
    </div>
  )
}
