CREATE TABLE IF NOT EXISTS "ProductEmbedding" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"productId" bigint NOT NULL,
	"workspaceId" bigint NOT NULL,
	"content" text NOT NULL,
	"contentHash" text NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer NOT NULL,
	"embedding" vector(3072) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "IntegrationOpenaiCompatible" ADD COLUMN IF NOT EXISTS "embeddingModel" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ProductEmbedding_productId_key" ON "ProductEmbedding" ("productId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ProductEmbedding_workspaceId_idx" ON "ProductEmbedding" ("workspaceId");--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'ProductEmbedding_productId_Product_id_fkey'
	) THEN
		ALTER TABLE "ProductEmbedding" ADD CONSTRAINT "ProductEmbedding_productId_Product_id_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'ProductEmbedding_workspaceId_Workspace_id_fkey'
	) THEN
		ALTER TABLE "ProductEmbedding" ADD CONSTRAINT "ProductEmbedding_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
END $$;
