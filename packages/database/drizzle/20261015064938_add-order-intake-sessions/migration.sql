CREATE TYPE "orderConversationSessionState" AS ENUM('collecting', 'draft_created', 'completed', 'abandoned', 'expired');--> statement-breakpoint
CREATE TABLE "OrderConversationSession" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"conversationId" bigint NOT NULL,
	"contactId" bigint,
	"intentMessageId" text NOT NULL,
	"state" "orderConversationSessionState" DEFAULT 'collecting'::"orderConversationSessionState" NOT NULL,
	"collectedData" jsonb NOT NULL,
	"orderId" bigint,
	"version" integer DEFAULT 1 NOT NULL,
	"expiresAt" timestamp(6) with time zone NOT NULL,
	"closedAt" timestamp(6) with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "OrderConversationSession_workspaceId_conversationId_intentMessageId_key" ON "OrderConversationSession" ("workspaceId","conversationId","intentMessageId");--> statement-breakpoint
CREATE UNIQUE INDEX "OrderConversationSession_orderId_key" ON "OrderConversationSession" ("orderId") WHERE "orderId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "OrderConversationSession_workspaceId_conversationId_createdAt_idx" ON "OrderConversationSession" ("workspaceId","conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "OrderConversationSession_workspaceId_conversationId_state_idx" ON "OrderConversationSession" ("workspaceId","conversationId","state");--> statement-breakpoint
ALTER TABLE "OrderConversationSession" ADD CONSTRAINT "OrderConversationSession_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderConversationSession" ADD CONSTRAINT "OrderConversationSession_conversationId_Conversation_id_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderConversationSession" ADD CONSTRAINT "OrderConversationSession_contactId_Contact_id_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "OrderConversationSession" ADD CONSTRAINT "OrderConversationSession_orderId_Order_id_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;