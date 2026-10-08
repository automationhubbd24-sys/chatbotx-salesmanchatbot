CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ProductEmbedding" (
	"id" bigint PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"productId" bigint NOT NULL,
	"workspaceId" bigint NOT NULL,
	"content" text NOT NULL,
	"contentHash" text NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer DEFAULT 3072 NOT NULL,
	"embedding" vector(3072) NOT NULL,
	CONSTRAINT "ProductEmbedding_productId_key" UNIQUE("productId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductEmbedding" ADD CONSTRAINT "ProductEmbedding_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductEmbedding" ADD CONSTRAINT "ProductEmbedding_workspaceId_Workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ProductEmbedding_workspaceId_idx" ON "ProductEmbedding" USING btree ("workspaceId" ASC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ProductEmbedding_embedding_hnsw_idx" ON "ProductEmbedding" USING hnsw ("embedding" vector_cosine_ops);
