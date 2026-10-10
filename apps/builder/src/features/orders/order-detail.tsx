"use client"

import type { OrderModel } from "@chatbotx.io/database/types"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chatbotx.io/ui/components/ui/card"
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { useClipboard } from "@/hooks/use-clipboard"
import { cancelOrderAction } from "./actions/cancel-order.action"
import { confirmOrderAction } from "./actions/confirm-order.action"
import { requestOrderConfirmationAction } from "./actions/request-confirmation.action"

type OrderDetail = OrderModel & {
  items: Array<{
    id: string
    productName: string
    sku: string | null
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  statusHistory: Array<{
    id: string
    fromStatus: OrderModel["status"] | null
    toStatus: OrderModel["status"]
    reason: string | null
    createdAt: Date
  }>
  customFieldValues: Array<{
    id: string
    value: unknown
    definition: {
      label: string
      key: string
    }
  }>
}

type OrderDetailProps = {
  order: OrderDetail
  workspaceId: string
}

export function OrderDetail({ order, workspaceId }: OrderDetailProps) {
  const t = useTranslations()
  const router = useRouter()
  const { handleCopy } = useClipboard()
  const mutationCallbacks = {
    onSuccess: () => {
      toast.success(t("actions.confirm"))
      router.refresh()
    },
    onError: ({ error }: { error: { serverError?: string } }) => {
      if (error.serverError) {
        toast.error(error.serverError)
      }
    },
  }
  const { execute: executeCancel, isPending: isCancelPending } = useAction(
    cancelOrderAction.bind(null, workspaceId),
    {
      onSuccess: () => {
        toast.success(t("actions.cancel"))
        router.refresh()
      },
      onError: mutationCallbacks.onError,
    },
  )
  const { execute: executeRequestConfirmation, isPending: isRequestPending } =
    useAction(
      requestOrderConfirmationAction.bind(null, workspaceId),
      mutationCallbacks,
    )
  const { execute: executeConfirm, isPending: isConfirmPending } = useAction(
    confirmOrderAction.bind(null, workspaceId),
    mutationCallbacks,
  )
  const confirmationMetadata = order.confirmationMetadata
  const canCancel =
    order.status === "draft" || order.status === "awaiting_confirmation"
  const statusLabel = (status: OrderModel["status"]) => {
    const labels: Record<OrderModel["status"], string> = {
      draft: t("orders.status.draft"),
      awaiting_confirmation: t("orders.lifecycle.awaitingConfirmation"),
      confirmed: t("orders.lifecycle.confirmed"),
      processing: t("orders.lifecycle.processing"),
      shipped: t("orders.lifecycle.shipped"),
      delivered: t("orders.lifecycle.delivered"),
      returned: t("orders.lifecycle.returned"),
      refunded: t("orders.lifecycle.refunded"),
      cancelled: t("orders.status.cancelled"),
      failed: t("orders.lifecycle.failed"),
      expired: t("orders.lifecycle.expired"),
    }
    return labels[status]
  }

  const fulfillmentLabel = (status: OrderDetail["fulfillmentStatus"]) => {
    const labels: Record<OrderDetail["fulfillmentStatus"], string> = {
      unfulfilled: t("orders.status.draft"),
      partially_fulfilled: t("orders.status.active"),
      fulfilled: t("orders.status.completed"),
      cancelled: t("orders.status.cancelled"),
    }
    return labels[status]
  }

  const typeLabel = (type: OrderModel["type"]) => {
    const labels: Record<OrderModel["type"], string> = {
      product: t("orders.types.product"),
      appointment: t("orders.types.appointment"),
      quote: t("orders.types.quote"),
      digital_service: t("orders.types.digitalService"),
    }
    return labels[type]
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

  return (
    <div className="space-y-4">
      <Button onClick={() => router.back()} size="sm" variant="ghost">
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("actions.back")}
      </Button>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{order.externalOrderId ?? order.id}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {order.status === "draft" ? (
              <Button
                disabled={isRequestPending}
                onClick={() =>
                  executeRequestConfirmation({ orderId: order.id })
                }
                size="sm"
                variant="outline"
              >
                {isRequestPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
                {t("actions.confirm")}
              </Button>
            ) : null}
            {order.status === "awaiting_confirmation" &&
            confirmationMetadata?.token &&
            typeof confirmationMetadata.version === "number" ? (
              <Button
                disabled={isConfirmPending}
                onClick={() =>
                  executeConfirm({
                    orderId: order.id,
                    token: confirmationMetadata.token as string,
                    version: confirmationMetadata.version as number,
                  })
                }
                size="sm"
              >
                {isConfirmPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
                {t("actions.confirm")}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                disabled={isCancelPending}
                onClick={() => executeCancel({ orderId: order.id })}
                size="sm"
                variant="destructive"
              >
                {isCancelPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <XIcon className="size-4" />
                )}
                {t("actions.cancel")}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium">{t("orders.fields.status")}: </span>
            {statusLabel(order.status)}
          </div>
          <div>
            <span className="font-medium">{t("orders.fields.type")}: </span>
            {typeLabel(order.type)}
          </div>
          <div>
            <span className="font-medium">
              {t("orders.fields.fulfillmentStatus")}:
            </span>
            {fulfillmentLabel(order.fulfillmentStatus)}
          </div>
          <div>
            <span className="font-medium">{t("orders.fields.source")}: </span>
            {sourceLabel(order.source)}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{t("orders.fields.orderId")}: </span>
            <span className="truncate">{order.id}</span>
            <Button
              aria-label={t("actions.copy")}
              onClick={() => handleCopy(order.id)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>
          {order.contactId ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {t("orders.fields.contactId")}:
              </span>
              <span className="truncate">{order.contactId}</span>
              <Button
                aria-label={t("actions.copy")}
                onClick={() => handleCopy(order.contactId ?? "")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
          ) : null}
          {order.conversationId ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {t("orders.fields.conversationId")}:
              </span>
              <span className="truncate">{order.conversationId}</span>
              <Button
                aria-label={t("actions.copy")}
                onClick={() => handleCopy(order.conversationId ?? "")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
          ) : null}
          <div>
            <span className="font-medium">{t("orders.fields.total")}: </span>
            {order.currency} {order.total.toFixed(2)}
          </div>
          <div>
            <span className="font-medium">
              {t("orders.fields.createdAt")}:{" "}
            </span>
            {order.createdAt.toLocaleString()}
          </div>
          {order.confirmedAt ? (
            <div>
              <span className="font-medium">
                {t("orders.fields.confirmedAt")}:{" "}
              </span>
              {order.confirmedAt.toLocaleString()}
            </div>
          ) : null}
          {order.expiresAt ? (
            <div>
              <span className="font-medium">
                {t("orders.fields.expiresAt")}:{" "}
              </span>
              {order.expiresAt.toLocaleString()}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {order.customerSnapshot ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.customerInformation")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(order.customerSnapshot).map(([key, value]) => {
              const isPhone =
                key.toLowerCase().includes("phone") ||
                key.toLowerCase().includes("mobile")
              const displayValue =
                value !== null && typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value ?? "—")

              return (
                <div className="flex items-center gap-2" key={key}>
                  <span className="font-medium">
                    {key
                      .replaceAll("_", " ")
                      .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    :{" "}
                  </span>
                  <span className="truncate">{displayValue}</span>
                  {isPhone && value ? (
                    <Button
                      aria-label={t("actions.copy")}
                      onClick={() => handleCopy(String(value))}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {order.customFieldValues.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.customFields")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {order.customFieldValues.map((field) => (
              <div key={field.id}>
                <span className="font-medium">
                  {field.definition.label || field.definition.key}:
                </span>
                {typeof field.value === "object"
                  ? JSON.stringify(field.value)
                  : String(field.value ?? "")}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("orders.fields.order")}</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("orders.empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="p-3 text-start font-medium">
                      {t("orders.fields.order")}
                    </th>
                    <th className="p-3 text-end font-medium">
                      {t("orders.fields.quantity")}
                    </th>
                    <th className="p-3 text-end font-medium">
                      {t("products.fields.price.label")}
                    </th>
                    <th className="p-3 text-end font-medium">
                      {t("orders.fields.total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr className="border-b last:border-0" key={item.id}>
                      <td className="p-3">
                        <div className="font-medium">{item.productName}</div>
                        {item.sku ? (
                          <div className="text-muted-foreground">
                            {item.sku}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 text-end">{item.quantity}</td>
                      <td className="p-3 text-end">
                        {order.currency} {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="p-3 text-end">
                        {order.currency} {item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("orders.fields.status")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.statusHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("orders.empty")}</p>
          ) : (
            order.statusHistory.map((entry) => (
              <div className="border-s ps-3 text-sm" key={entry.id}>
                <div className="font-medium">
                  {entry.fromStatus
                    ? `${statusLabel(entry.fromStatus)} → `
                    : ""}
                  {statusLabel(entry.toStatus)}
                </div>
                <div className="text-muted-foreground">
                  {entry.createdAt.toLocaleString()}
                </div>
                {entry.reason ? (
                  <div className="text-muted-foreground text-xs">
                    {entry.reason
                      .replaceAll("_", " ")
                      .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
