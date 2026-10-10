"use client"

import type { OrderModel } from "@chatbotx.io/database/types"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chatbotx.io/ui/components/ui/card"
import { Input } from "@chatbotx.io/ui/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@chatbotx.io/ui/components/ui/tabs"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"

type OrderFilter = "all" | "draft" | "active" | "completed" | "cancelled"

type OrdersTableProps = {
  filter: OrderFilter
  orders: OrderModel[]
  page: number
  pageCount: number
  search: string
}

export function OrdersTable({
  filter,
  orders,
  page,
  pageCount,
  search,
}: OrdersTableProps) {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(search)

  useEffect(() => {
    setSearchValue(search)
  }, [search])

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
        <div className="max-w-sm">
          <Input
            aria-label={t("orders.search")}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                navigate({ search: searchValue.trim() || undefined, page: "1" })
              }
            }}
            placeholder={t("orders.search")}
            value={searchValue}
          />
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
