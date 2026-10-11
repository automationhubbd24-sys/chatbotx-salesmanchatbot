import { orderService } from "@chatbotx.io/business"
import { OrdersTable } from "@/features/orders/orders-table"
import { assertCurrentUserCanAccessChatbot } from "@/lib/auth/utils"

function getDateRange(preset: string | undefined, from: string | undefined, to: string | undefined) {
  const start = from ? new Date(`${from}T00:00:00`) : undefined
  const end = to ? new Date(`${to}T00:00:00`) : undefined
  if (end) end.setDate(end.getDate() + 1)
  if (preset === "today" || preset === "yesterday") {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    if (preset === "yesterday") date.setDate(date.getDate() - 1)
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    return { createdFrom: date, createdTo: next, datePreset: preset, dateFrom: undefined, dateTo: undefined }
  }
  return { createdFrom: start, createdTo: end, datePreset: undefined, dateFrom: from, dateTo: to }
}

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
  searchParams: Promise<{ filter?: string; page?: string; search?: string; date?: string; from?: string; to?: string }>
}) {
  const { workspaceId } = await params
  const query = await searchParams
  await assertCurrentUserCanAccessChatbot(workspaceId)

  const filter: OrderFilter = filters.includes(query.filter as OrderFilter)
    ? (query.filter as OrderFilter)
    : "all"
  const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1)
  const search = query.search?.trim() || undefined
  const dateRange = getDateRange(query.date, query.from, query.to)
  const [orders, customFieldDefinitions] = await Promise.all([
    orderService.list({
      workspaceId,
      page,
      perPage: 25,
      search,
      statuses: statusesByFilter[filter],
      createdFrom: dateRange.createdFrom,
      createdTo: dateRange.createdTo,
    }),
    orderService.listCustomFieldDefinitions({ workspaceId }),
  ])

  return (
    <OrdersTable
      filter={filter}
      orders={orders.data}
      customFieldDefinitions={customFieldDefinitions}
      page={page}
      pageCount={orders.pageCount}
      search={search ?? ""}
      datePreset={dateRange.datePreset}
      dateFrom={dateRange.dateFrom}
      dateTo={dateRange.dateTo}
    />
  )
}
