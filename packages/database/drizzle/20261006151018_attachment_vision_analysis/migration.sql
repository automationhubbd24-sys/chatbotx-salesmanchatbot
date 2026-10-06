CREATE TABLE "AttachmentVisionAnalysis" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" text NOT NULL,
	"conversationId" text NOT NULL,
	"attachmentId" text NOT NULL,
	"promptHash" text NOT NULL,
	"provider" text NOT NULL,
	"modelId" text NOT NULL,
	"analysis" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "AttachmentVisionAnalysis_workspace_attachment_prompt_provider_model_key" ON "AttachmentVisionAnalysis" ("workspaceId","attachmentId","promptHash","provider","modelId");--> statement-breakpoint
CREATE INDEX "AttachmentVisionAnalysis_workspace_attachment_idx" ON "AttachmentVisionAnalysis" ("workspaceId","attachmentId");--> statement-breakpoint
CREATE INDEX "AttachmentVisionAnalysis_workspace_conversation_idx" ON "AttachmentVisionAnalysis" ("workspaceId","conversationId");