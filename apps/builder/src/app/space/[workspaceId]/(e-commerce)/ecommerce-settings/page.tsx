import { orderService } from "@chatbotx.io/business"
import { OrderCustomFieldsManager } from "@/features/order-custom-fields/components/order-custom-fields-manager"
import { assertCurrentUserCanAccessChatbot } from "@/lib/auth/utils"

export default async function EcommerceSettingsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  await assertCurrentUserCanAccessChatbot(workspaceId)
  const definitions = await orderService.listCustomFieldDefinitions({ workspaceId })
  return <OrderCustomFieldsManager definitions={definitions} workspaceId={workspaceId} />
}
