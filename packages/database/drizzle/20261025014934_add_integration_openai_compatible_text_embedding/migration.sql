CREATE TABLE "IntegrationOpenaiCompatibleEmbedding" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"auth" jsonb NOT NULL,
	"baseURL" text NOT NULL,
	"embeddingModel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"integrationId" bigint NOT NULL,
	"workspaceId" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "IntegrationOpenaiCompatibleEmbedding_workspaceId_key" ON "IntegrationOpenaiCompatibleEmbedding" ("workspaceId");--> statement-breakpoint
CREATE UNIQUE INDEX "IntegrationOpenaiCompatibleEmbedding_integrationId_key" ON "IntegrationOpenaiCompatibleEmbedding" ("integrationId");--> statement-breakpoint
ALTER TABLE "IntegrationOpenaiCompatibleEmbedding" ADD CONSTRAINT "IntegrationOpenaiCompatibleEmbedding_OkE3TMKNzMaU_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "IntegrationOpenaiCompatibleEmbedding" ADD CONSTRAINT "IntegrationOpenaiCompatibleEmbedding_k9nTCTnZG8RY_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;