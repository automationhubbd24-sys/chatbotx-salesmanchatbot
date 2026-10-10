import { orderService } from "@chatbotx.io/business"
import { OrdersTable } from "@/features/orders/orders-table"
import { assertCurrentUserCanAccessChatbot } from "@/lib/auth/utils"

const filters = ["all", "draft", "active", "completed", "cancelled"] as const
type OrderFilter = (typeof filters)[number]

const statusesByFilter: Partial<Record<OrderFilter, Parameters<typeof orderService.list>[0]["statuses"]>> = {
  draft: ["draft"],
  active: ["awaiting_confirmation", "confirmed", "processing", "shipped"],
  completed: ["delivered", "returned", "refunded"],
  cancelled: ["cancelled", "failed", "expired"],
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>
  searchParams: Promise<{ filter?: string; page?: string; search?: string }>
}) {
  const { workspaceId } = await params
  const query = await searchParams
  await assertCurrentUserCanAccessChatbot(workspaceId)

  const filter: OrderFilter = filters.includes(query.filter as OrderFilter)
    ? (query.filter as OrderFilter)
    : "all"
  const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1)
  const search = query.search?.trim() || undefined
  const orders = await orderService.list({
    workspaceId,
    page,
    perPage: 25,
    search,
    statuses: statusesByFilter[filter],
  })

  return (
    <OrdersTable
      filter={filter}
      orders={orders.data}
      page={page}
      pageCount={orders.pageCount}
      search={search ?? ""}
    />
  )
}
