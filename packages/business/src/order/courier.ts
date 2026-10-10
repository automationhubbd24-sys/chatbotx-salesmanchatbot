import { toLogSafeError } from "@chatbotx.io/logger"
import { ChatbotXException } from "../errors"
import { logger } from "../logger"

export const courierProviderUnavailableException = (provider: string) =>
  new ChatbotXException(
    `Courier provider "${provider}" is not available.`,
    "courierProviderUnavailable",
    503,
  )

export type CourierProviderId = string
export type CourierShipmentId = string

export type CourierAddress = {
  name: string
  phone: string
  address: string
  city?: string
  area?: string
  postalCode?: string
}

export type CourierPackage = {
  description?: string
  quantity?: number
  weightGrams?: number
  cashOnDelivery?: number
  value?: number
}

export type CreateShipmentInput = {
  orderId: string
  merchantReference?: string
  recipient: CourierAddress
  package: CourierPackage
  metadata?: Record<string, unknown>
}

export type Shipment = {
  provider: CourierProviderId
  shipmentId: CourierShipmentId
  trackingNumber?: string
  status: ShipmentStatus
  createdAt?: Date
  estimatedDeliveryAt?: Date
  raw?: unknown
}

export type TrackingEvent = {
  status: ShipmentStatus
  occurredAt?: Date
  description?: string
  location?: string
  raw?: unknown
}

export type TrackingResult = {
  provider: CourierProviderId
  shipmentId: CourierShipmentId
  trackingNumber?: string
  status: ShipmentStatus
  events: TrackingEvent[]
  raw?: unknown
}

export type CancelShipmentResult = {
  provider: CourierProviderId
  shipmentId: CourierShipmentId
  status: Extract<ShipmentStatus, "cancelled" | "cancellation_requested">
  raw?: unknown
}

export type CoverageQuery = {
  city?: string
  area?: string
  postalCode?: string
}

export type CoverageResult = {
  provider: CourierProviderId
  covered: boolean
  reason?: string
  raw?: unknown
}

export type CourierWebhookEvent = {
  provider: CourierProviderId
  externalShipmentId: string
  externalStatus: string
  status?: ShipmentStatus
  occurredAt?: Date
  trackingNumber?: string
  description?: string
  raw: unknown
}

export const shipmentStatuses = [
  "created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "returned",
  "cancelled",
  "cancellation_requested",
  "failed",
  "unknown",
] as const
export type ShipmentStatus = (typeof shipmentStatuses)[number]

export type CourierProvider = {
  readonly id: CourierProviderId
  createShipment(input: CreateShipmentInput): Promise<Shipment>
  getTracking(input: {
    shipmentId?: string
    trackingNumber?: string
  }): Promise<TrackingResult>
  cancelShipment(input: { shipmentId: string; reason?: string }): Promise<CancelShipmentResult>
  checkCoverage(input: CoverageQuery): Promise<CoverageResult>
  parseWebhook(input: { payload: unknown; headers?: Record<string, string | undefined> }): CourierWebhookEvent
  mapStatus(externalStatus: string): ShipmentStatus
}

export type CourierProviderRegistry = ReadonlyMap<CourierProviderId, CourierProvider>

export const createCourierProviderRegistry = (
  providers: readonly CourierProvider[],
): CourierProviderRegistry => new Map(providers.map((provider) => [provider.id, provider]))

export class CourierService {
  constructor(private readonly providers: CourierProviderRegistry) {}

  createShipment(providerId: string, input: CreateShipmentInput) {
    return this.execute(providerId, "createShipment", (provider) => provider.createShipment(input))
  }

  getTracking(providerId: string, input: { shipmentId?: string; trackingNumber?: string }) {
    return this.execute(providerId, "getTracking", (provider) => provider.getTracking(input))
  }

  cancelShipment(providerId: string, input: { shipmentId: string; reason?: string }) {
    return this.execute(providerId, "cancelShipment", (provider) => provider.cancelShipment(input))
  }

  checkCoverage(providerId: string, input: CoverageQuery) {
    return this.execute(providerId, "checkCoverage", (provider) => provider.checkCoverage(input))
  }

  parseWebhook(providerId: string, input: { payload: unknown; headers?: Record<string, string | undefined> }) {
    const provider = this.requireProvider(providerId)
    try {
      return provider.parseWebhook(input)
    } catch (error) {
      logger.error(
        { err: toLogSafeError(error), providerId, operation: "parseWebhook" },
        "Courier provider webhook parsing failed",
      )
      throw courierProviderUnavailableException(providerId)
    }
  }

  private requireProvider(providerId: string) {
    const provider = this.providers.get(providerId)
    if (!provider) {
      logger.warn({ providerId }, "Courier provider is not configured")
      throw courierProviderUnavailableException(providerId)
    }
    return provider
  }

  private async execute<T>(
    providerId: string,
    operation: string,
    callback: (provider: CourierProvider) => Promise<T>,
  ): Promise<T> {
    const provider = this.requireProvider(providerId)
    try {
      return await callback(provider)
    } catch (error) {
      logger.error(
        { err: toLogSafeError(error), providerId, operation },
        "Courier provider operation failed",
      )
      throw courierProviderUnavailableException(providerId)
    }
  }
}

export const createCourierService = (providers: readonly CourierProvider[]) =>
  new CourierService(createCourierProviderRegistry(providers))
