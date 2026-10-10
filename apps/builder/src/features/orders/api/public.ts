import { orderService } from "@chatbotx.io/business"
import { externalOrderIntakeSchema, normalizeExternalOrder } from "../lib/normalize-external-order"
import {
  possibleErrorsOnCreatingResource,
  possibleErrorsOnFindingResource,
  possibleErrorsOnListingResource,
} from "@/lib/orpc/orpc-error-helper"
import { publicListResponse } from "@/lib/public-api/list"
import { workspaceTokenAuthAPIForScope } from "@/orpc"
import {
  listOrdersPublicRequest,
  orderIdPublicRequest,
  publicOrderResource,
} from "../schema/public"

const workspaceTokenAuthAPI = workspaceTokenAuthAPIForScope("ecommerce")
const tags = ["Orders"]

export const ordersPublicRouter = {
  list: workspaceTokenAuthAPI
    .route({
      method: "GET",
      path: "/v1/orders",
      summary: "List orders",
      description: "Lists paginated orders imported or created in this workspace.",
      tags,
    })
    .input(listOrdersPublicRequest)
    .output(publicListResponse(publicOrderResource))
    .errors(possibleErrorsOnListingResource)
    .handler(async ({ context, input }) => {
      const result = await orderService.list({
        workspaceId: context.workspace.id,
        page: input.page,
        perPage: input.perPage,
        status: input.status,
        search: input.search,
      })
      return { data: result.data, pageCount: result.pageCount }
    }),

  get: workspaceTokenAuthAPI
    .route({
      method: "GET",
      path: "/v1/orders/{id}",
      summary: "Get order",
      description: "Returns one workspace order with its current lifecycle state.",
      tags,
    })
    .input(orderIdPublicRequest)
    .output(publicOrderResource)
    .errors(possibleErrorsOnFindingResource)
    .handler(async ({ context, input }) => {
      const order = await orderService.getById({
        workspaceId: context.workspace.id,
        orderId: input.id,
      })
      return publicOrderResource.parse({ ...order, items: order.items ?? [] })
    }),

  import: workspaceTokenAuthAPI
    .route({
      method: "POST",
      path: "/v1/orders/import",
      summary: "Import external order data",
      description:
        "Creates or returns an order imported from a website, landing page, Messenger, Instagram, or WhatsApp. Repeating the same source and externalOrderId is idempotent and will not create a duplicate order.",
      successStatus: 201,
      tags,
    })
    .input(externalOrderIntakeSchema)
    .output(publicOrderResource)
    .errors(possibleErrorsOnCreatingResource)
    .handler(async ({ context, input }) => {
      const normalized = normalizeExternalOrder(input)
      return publicOrderResource.parse(
        await orderService.importExternalOrder({
          workspaceId: context.workspace.id,
          ...normalized,
        }),
      )
    }),
}
