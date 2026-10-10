import { describe, expect, test, vi } from "vitest"
import {
  createCourierService,
  type CourierProvider,
  courierProviderUnavailableException,
} from "../src/order/courier"

const provider = (overrides: Partial<CourierProvider> = {}): CourierProvider => ({
  id: "mock-courier",
  createShipment: vi.fn(async () => ({
    provider: "mock-courier",
    shipmentId: "shipment-1",
    status: "created" as const,
  })),
  getTracking: vi.fn(async () => ({
    provider: "mock-courier",
    shipmentId: "shipment-1",
    status: "in_transit" as const,
    events: [],
  })),
  cancelShipment: vi.fn(async () => ({
    provider: "mock-courier",
    shipmentId: "shipment-1",
    status: "cancelled" as const,
  })),
  checkCoverage: vi.fn(async () => ({
    provider: "mock-courier",
    covered: true,
  })),
  parseWebhook: vi.fn(({ payload }) => ({
    provider: "mock-courier",
    externalShipmentId: "shipment-1",
    externalStatus: "delivered",
    raw: payload,
  })),
  mapStatus: vi.fn(() => "delivered" as const),
  ...overrides,
})

describe("CourierService", () => {
  test("delegates shipment operations to a registered provider", async () => {
    const mockProvider = provider()
    const service = createCourierService([mockProvider])

    await expect(service.createShipment("mock-courier", {
      orderId: "order-1",
      recipient: { name: "Customer", phone: "+8801700000000", address: "Dhaka" },
      package: { value: 1000 },
    })).resolves.toMatchObject({ shipmentId: "shipment-1" })
    await expect(service.getTracking("mock-courier", { shipmentId: "shipment-1" })).resolves.toMatchObject({ status: "in_transit" })
    await expect(service.cancelShipment("mock-courier", { shipmentId: "shipment-1" })).resolves.toMatchObject({ status: "cancelled" })
    await expect(service.checkCoverage("mock-courier", { city: "Dhaka" })).resolves.toMatchObject({ covered: true })
    expect(service.parseWebhook("mock-courier", { payload: { status: "delivered" } })).toMatchObject({
      externalStatus: "delivered",
    })

    expect(mockProvider.createShipment).toHaveBeenCalledOnce()
    expect(mockProvider.getTracking).toHaveBeenCalledWith({ shipmentId: "shipment-1" })
    expect(mockProvider.cancelShipment).toHaveBeenCalledWith({ shipmentId: "shipment-1" })
  })

  test("fails closed when a provider is unavailable", async () => {
    const service = createCourierService([])

    await expect(service.createShipment("pathao", {
      orderId: "order-1",
      recipient: { name: "Customer", phone: "+8801700000000", address: "Dhaka" },
      package: {},
    })).rejects.toMatchObject({
      code: "courierProviderUnavailable",
      httpStatusCode: 503,
    })

    expect(courierProviderUnavailableException("redx")).toMatchObject({
      code: "courierProviderUnavailable",
      httpStatusCode: 503,
    })
  })

  test("maps provider failures to a safe unavailable error", async () => {
    const mockProvider = provider({
      getTracking: vi.fn(async () => { throw new Error("provider secret or endpoint detail") }),
    })
    const service = createCourierService([mockProvider])

    await expect(service.getTracking("mock-courier", { trackingNumber: "TRK-1" })).rejects.toMatchObject({
      code: "courierProviderUnavailable",
      httpStatusCode: 503,
    })
  })
})
