"use client"

import type { OrderStatus } from "@chatbotx.io/database/partials"
import type {
  OrderCustomFieldDefinitionModel,
  OrderModel,
} from "@chatbotx.io/database/types"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import { Calendar } from "@chatbotx.io/ui/components/ui/calendar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chatbotx.io/ui/components/ui/card"
import { Input } from "@chatbotx.io/ui/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@chatbotx.io/ui/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@chatbotx.io/ui/components/ui/tabs"
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterIcon,
} from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { exportOrdersAction } from "./actions/export-orders.action"
import type { OrderCustomFieldDisplay } from "./custom-field-display"
import { formatOrderCustomFieldValue } from "./custom-field-display"
import { SyncOrdersToGoogleSheetsDialog } from "./sync-orders-to-google-sheets-dialog"

type OrderFilter = "all" | "draft" | "active" | "completed" | "cancelled"

type OrderListItem = OrderModel & {
  customFields: OrderCustomFieldDisplay[]
}

type OrdersTableProps = {
  workspaceId: string
  filter: OrderFilter
  orders: OrderListItem[]
  customFieldDefinitions: OrderCustomFieldDefinitionModel[]
  page: number
  pageCount: number
  search: string
  datePreset?: string
  dateFrom?: string
  dateTo?: string
}

export function OrdersTable({
  workspaceId,
  filter,
  orders,
  customFieldDefinitions,
  page,
  pageCount,
  search,
  datePreset,
  dateFrom,
  dateTo,
}: OrdersTableProps) {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(search)
  const { executeAsync: executeExport, isPending: isExporting } = useAction(
    exportOrdersAction.bind(null, workspaceId),
  )
  const [dateRange, setDateRange] = useState<DateRange>({
    from: dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined,
    to: dateTo ? new Date(`${dateTo}T00:00:00`) : undefined,
  })

  useEffect(() => {
    setSearchValue(search)
  }, [search])

  useEffect(() => {
    setDateRange({
      from: dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined,
      to: dateTo ? new Date(`${dateTo}T00:00:00`) : undefined,
    })
  }, [dateFrom, dateTo])

  const navigate = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const filteredOrders = useMemo(() => orders, [orders])
  const getExportDateRange = (preset?: string, from?: string, to?: string) => {
    if (preset === "today" || preset === "yesterday") {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      if (preset === "yesterday") {
        start.setDate(start.getDate() - 1)
      }
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { createdFrom: start, createdTo: end }
    }
    return {
      createdFrom: from ? new Date(`${from}T00:00:00`) : undefined,
      createdTo: to ? new Date(`${to}T00:00:00`) : undefined,
    }
  }
  const statusFilters: Record<OrderFilter, OrderStatus[] | undefined> = {
    all: undefined,
    draft: ["draft"],
    active: ["awaiting_confirmation", "confirmed", "processing", "shipped"],
    completed: ["delivered", "returned", "refunded"],
    cancelled: ["cancelled", "failed", "expired"],
  }
  const handleExport = async () => {
    const result = await executeExport({
      statuses: statusFilters[filter],
      search: search || undefined,
      ...getExportDateRange(datePreset, dateFrom, dateTo),
    })
    if (!result?.data) {
      toast.error(t("messages.error"))
      return
    }
    const blob = new Blob([result.data.content], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = result.data.filename
    link.click()
    URL.revokeObjectURL(url)
  }
  const customFields = useMemo(() => {
    const fields = new Map<string, OrderCustomFieldDisplay>()
    for (const definition of customFieldDefinitions) {
      fields.set(definition.id, {
        definitionId: definition.id,
        key: definition.key,
        label: definition.label,
        type: definition.type,
        options: definition.options,
        displayOrder: definition.displayOrder,
        value: undefined,
      })
    }
    for (const order of orders) {
      for (const field of order.customFields) {
        fields.set(field.definitionId, field)
      }
    }
    return [...fields.values()].sort((a, b) => a.displayOrder - b.displayOrder)
  }, [customFieldDefinitions, orders])

  const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

  let dateFilterLabel = t("orders.dateFilters.filter")
  if (datePreset === "today") {
    dateFilterLabel = t("orders.dateFilters.today")
  } else if (datePreset === "yesterday") {
    dateFilterLabel = t("orders.dateFilters.yesterday")
  } else if (dateFrom || dateTo) {
    dateFilterLabel = `${dateFrom ?? "…"} – ${dateTo ?? "…"}`
  }

  const sourceLabel = (source: OrderModel["source"]) => {
    const labels: Record<OrderModel["source"], string> = {
      ai: t("orders.sources.ai"),
      website: t("orders.sources.website"),
      landing_page: t("orders.sources.landingPage"),
      messenger: t("orders.sources.messenger"),
      instagram: t("orders.sources.instagram"),
      whatsapp: t("orders.sources.whatsapp"),
      manual: t("orders.sources.manual"),
      api: t("orders.sources.api"),
    }
    return labels[source]
  }

  const statusLabel = (status: OrderModel["status"]) => {
    const labels: Record<OrderModel["status"], string> = {
      draft: t("orders.status.draft"),
      awaiting_confirmation: t("orders.status.active"),
      confirmed: t("orders.status.active"),
      processing: t("orders.status.active"),
      shipped: t("orders.status.active"),
      delivered: t("orders.status.completed"),
      returned: t("orders.status.completed"),
      refunded: t("orders.status.completed"),
      cancelled: t("orders.status.cancelled"),
      failed: t("orders.status.cancelled"),
      expired: t("orders.status.cancelled"),
    }
    return labels[status]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold text-xl">{t("orders.title")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={isExporting}
            onClick={handleExport}
            variant="outline"
          >
            <DownloadIcon className="size-4" />
            {isExporting ? t("actions.loading") : t("actions.export")}
          </Button>
          <SyncOrdersToGoogleSheetsDialog
            filters={{
              statuses: statusFilters[filter],
              search: search || undefined,
              ...getExportDateRange(datePreset, dateFrom, dateTo),
            }}
            workspaceId={workspaceId}
          />
          <div className="max-w-sm">
            <Input
              aria-label={t("orders.search")}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  navigate({
                    search: searchValue.trim() || undefined,
                    page: "1",
                  })
                }
              }}
              placeholder={t("orders.search")}
              value={searchValue}
            />
          </div>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant={
                    datePreset || dateFrom || dateTo ? "default" : "outline"
                  }
                >
                  <FilterIcon className="size-4" />
                  {dateFilterLabel}
                </Button>
              }
            />
            <PopoverContent align="end" className="w-auto p-3">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      navigate({
                        date: "today",
                        from: undefined,
                        to: undefined,
                        page: "1",
                      })
                    }
                    size="sm"
                    variant={datePreset === "today" ? "default" : "outline"}
                  >
                    {t("orders.dateFilters.today")}
                  </Button>
                  <Button
                    onClick={() =>
                      navigate({
                        date: "yesterday",
                        from: undefined,
                        to: undefined,
                        page: "1",
                      })
                    }
                    size="sm"
                    variant={datePreset === "yesterday" ? "default" : "outline"}
                  >
                    {t("orders.dateFilters.yesterday")}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <CalendarDaysIcon className="size-4" />
                  {t("orders.dateFilters.custom")}
                </div>
                <Calendar
                  mode="range"
                  onSelect={(nextRange) =>
                    setDateRange(
                      nextRange ?? { from: undefined, to: undefined },
                    )
                  }
                  selected={dateRange}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() =>
                      navigate({
                        date: undefined,
                        from: undefined,
                        to: undefined,
                        page: "1",
                      })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    {t("orders.dateFilters.clear")}
                  </Button>
                  <Button
                    disabled={!(dateRange.from && dateRange.to)}
                    onClick={() =>
                      navigate({
                        date: undefined,
                        from: dateRange.from
                          ? formatDateKey(dateRange.from)
                          : undefined,
                        to: dateRange.to
                          ? formatDateKey(dateRange.to)
                          : undefined,
                        page: "1",
                      })
                    }
                    size="sm"
                  >
                    {t("orders.dateFilters.apply")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          onValueChange={(value) =>
            navigate({ filter: value === "all" ? undefined : value, page: "1" })
          }
          value={filter}
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">{t("orders.tabs.all")}</TabsTrigger>
            <TabsTrigger value="draft">{t("orders.tabs.draft")}</TabsTrigger>
            <TabsTrigger value="active">{t("orders.tabs.active")}</TabsTrigger>
            <TabsTrigger value="completed">
              {t("orders.tabs.completed")}
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              {t("orders.tabs.cancelled")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredOrders.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {t("orders.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-start">
                <tr>
                  <th className="p-3 text-start font-medium">
                    {t("orders.fields.order")}
                  </th>
                  <th className="p-3 text-start font-medium">
                    {t("orders.fields.status")}
                  </th>
                  <th className="p-3 text-start font-medium">
                    {t("orders.fields.source")}
                  </th>
                  <th className="p-3 text-end font-medium">
                    {t("orders.fields.total")}
                  </th>
                  <th className="p-3 text-start font-medium">
                    {t("orders.fields.createdAt")}
                  </th>
                  {customFields.map((field) => (
                    <th
                      className="p-3 text-start font-medium"
                      key={field.definitionId}
                    >
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                    key={order.id}
                    onClick={() => router.push(`${pathname}/${order.id}`)}
                  >
                    <td className="p-3 font-medium">
                      {order.externalOrderId ?? order.id}
                    </td>
                    <td className="p-3">{statusLabel(order.status)}</td>
                    <td className="p-3 text-muted-foreground">
                      {sourceLabel(order.source)}
                    </td>
                    <td className="p-3 text-end">
                      {order.currency} {order.total.toFixed(2)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {order.createdAt.toLocaleDateString()}
                    </td>
                    {customFields.map((field) => {
                      const orderField =
                        order.customFields.find(
                          (candidate) =>
                            candidate.definitionId === field.definitionId,
                        ) ?? field
                      const value = formatOrderCustomFieldValue(
                        orderField,
                        order.currency,
                        t("orders.customFieldValues.empty"),
                        t("orders.customFieldValues.yes"),
                        t("orders.customFieldValues.no"),
                      )
                      return (
                        <td
                          className="max-w-56 truncate p-3"
                          key={field.definitionId}
                          title={value}
                        >
                          {value}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-muted-foreground">
              {t("analytics.pagination.pageOf", { page, pageCount })}
            </span>
            <Button
              aria-label={t("analytics.pagination.previousPage")}
              disabled={page <= 1}
              onClick={() => navigate({ page: String(Math.max(1, page - 1)) })}
              size="icon"
              variant="outline"
            >
              <ChevronLeftIcon className="size-4 rtl:rotate-180" />
            </Button>
            <Button
              aria-label={t("analytics.pagination.nextPage")}
              disabled={page >= pageCount}
              onClick={() =>
                navigate({ page: String(Math.min(pageCount, page + 1)) })
              }
              size="icon"
              variant="outline"
            >
              <ChevronRightIcon className="size-4 rtl:rotate-180" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
