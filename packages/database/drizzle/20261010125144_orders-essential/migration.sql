CREATE TYPE "orderCustomFieldType" AS ENUM('text', 'phone', 'email', 'number', 'currency', 'date', 'datetime', 'select', 'multiselect', 'address', 'product', 'variant', 'boolean', 'textarea');--> statement-breakpoint
CREATE TYPE "orderFulfillmentStatus" AS ENUM('unfulfilled', 'partially_fulfilled', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "orderSource" AS ENUM('ai', 'website', 'landing_page', 'messenger', 'instagram', 'whatsapp', 'manual', 'api');--> statement-breakpoint
CREATE TYPE "orderStatus" AS ENUM('draft', 'awaiting_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "orderType" AS ENUM('product', 'appointment', 'quote', 'digital_service');--> statement-breakpoint
CREATE TABLE "ExternalOrderMapping" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"orderId" bigint NOT NULL,
	"provider" text NOT NULL,
	"externalOrderId" text NOT NULL,
	"externalStatus" text,
	"rawPayload" jsonb,
	"lastSyncedAt" timestamp(6) with time zone
);
--> statement-breakpoint
CREATE TABLE "OrderCustomFieldDefinition" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"orderType" "orderType" NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" "orderCustomFieldType" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"aiVisible" boolean DEFAULT true NOT NULL,
	"customerEditable" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OrderCustomFieldValue" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"orderId" bigint NOT NULL,
	"definitionId" bigint NOT NULL,
	"value" jsonb
);
--> statement-breakpoint
CREATE TABLE "OrderItem" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"orderId" bigint NOT NULL,
	"productId" bigint,
	"variantId" bigint,
	"productName" text NOT NULL,
	"sku" text,
	"unitPrice" double precision DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"lineTotal" double precision DEFAULT 0 NOT NULL,
	"snapshot" jsonb
);
--> statement-breakpoint
CREATE TABLE "Order" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"contactId" bigint,
	"conversationId" bigint,
	"type" "orderType" NOT NULL,
	"status" "orderStatus" DEFAULT 'draft'::"orderStatus" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"fulfillmentStatus" "orderFulfillmentStatus" DEFAULT 'unfulfilled'::"orderFulfillmentStatus" NOT NULL,
	"source" "orderSource" NOT NULL,
	"externalOrderId" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"deliveryFee" double precision DEFAULT 0 NOT NULL,
	"discount" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"customerSnapshot" jsonb,
	"confirmationMetadata" jsonb,
	"expiresAt" timestamp(6) with time zone,
	"confirmedAt" timestamp(6) with time zone
);
--> statement-breakpoint
CREATE TABLE "OrderStatusHistory" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"orderId" bigint NOT NULL,
	"fromStatus" "orderStatus",
	"toStatus" "orderStatus" NOT NULL,
	"reason" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ExternalOrderMapping_workspaceId_provider_externalOrderId_key" ON "ExternalOrderMapping" ("workspaceId","provider","externalOrderId");--> statement-breakpoint
CREATE UNIQUE INDEX "ExternalOrderMapping_orderId_provider_key" ON "ExternalOrderMapping" ("orderId","provider");--> statement-breakpoint
CREATE INDEX "ExternalOrderMapping_workspaceId_orderId_idx" ON "ExternalOrderMapping" ("workspaceId","orderId");--> statement-breakpoint
CREATE UNIQUE INDEX "OrderCustomFieldDefinition_workspaceId_orderType_key" ON "OrderCustomFieldDefinition" ("workspaceId","orderType","key");--> statement-breakpoint
CREATE INDEX "OrderCustomFieldDefinition_workspaceId_orderType_displayOrder_idx" ON "OrderCustomFieldDefinition" ("workspaceId","orderType","displayOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "OrderCustomFieldValue_orderId_definitionId_key" ON "OrderCustomFieldValue" ("orderId","definitionId");--> statement-breakpoint
CREATE INDEX "OrderCustomFieldValue_definitionId_idx" ON "OrderCustomFieldValue" ("definitionId");--> statement-breakpoint
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem" ("orderId");--> statement-breakpoint
CREATE INDEX "Order_workspaceId_status_createdAt_idx" ON "Order" ("workspaceId","status","createdAt");--> statement-breakpoint
CREATE INDEX "Order_workspaceId_contactId_createdAt_idx" ON "Order" ("workspaceId","contactId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "Order_workspaceId_source_externalOrderId_key" ON "Order" ("workspaceId","source","externalOrderId") WHERE "externalOrderId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory" ("orderId","createdAt");--> statement-breakpoint
ALTER TABLE "ExternalOrderMapping" ADD CONSTRAINT "ExternalOrderMapping_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ExternalOrderMapping" ADD CONSTRAINT "ExternalOrderMapping_orderId_Order_id_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderCustomFieldDefinition" ADD CONSTRAINT "OrderCustomFieldDefinition_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderCustomFieldValue" ADD CONSTRAINT "OrderCustomFieldValue_orderId_Order_id_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderCustomFieldValue" ADD CONSTRAINT "OrderCustomFieldValue_MzGAEpqaYzWS_fkey" FOREIGN KEY ("definitionId") REFERENCES "OrderCustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_Order_id_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_Product_id_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_ProductVariant_id_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Order" ADD CONSTRAINT "Order_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Order" ADD CONSTRAINT "Order_contactId_Contact_id_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "Order" ADD CONSTRAINT "Order_conversationId_Conversation_id_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_Order_id_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;