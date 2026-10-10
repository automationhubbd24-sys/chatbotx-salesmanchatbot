import { orderService } from "@chatbotx.io/business"
import { OrderDetail } from "@/features/orders/order-detail"
import { assertCurrentUserCanAccessChatbot } from "@/lib/auth/utils"

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; orderId: string }>
}) {
  const { workspaceId, orderId } = await params
  await assertCurrentUserCanAccessChatbot(workspaceId)

  const order = await orderService.getById({
    workspaceId,
    orderId,
  })

  return <OrderDetail order={order} workspaceId={workspaceId} />
}
