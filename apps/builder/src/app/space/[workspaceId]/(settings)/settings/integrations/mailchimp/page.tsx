import { integrationMailchimpService } from "@salesmanchatbot.io/business"
import { getIdFromParams } from "@salesmanchatbot.io/utils"
import { notFound } from "next/navigation"
import { ManageMailchimp } from "@/features/integration-mailchimp/components/manage-mailchimp"

export default async function SettingIntegrationMailchimpPage(props: {
  params: Promise<{ workspaceId: string }>
}) {
  const workspaceId = getIdFromParams(await props.params, "workspaceId")
  if (!workspaceId) {
    return notFound()
  }

  const integration =
    await integrationMailchimpService.findByWorkspaceId(workspaceId)

  return (
    <ManageMailchimp
      isConnected={Boolean(integration)}
      workspaceId={workspaceId}
    />
  )
}
