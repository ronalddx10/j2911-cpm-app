CREATE TABLE "bridge_cpm_meal_period_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"meal_period_id" bigint NOT NULL,
	"item_id" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bridge_cpm_meal_periods" ALTER COLUMN "menu_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bridge_cpm_meal_periods" ADD COLUMN "meal_period" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "bridge_cpm_meal_periods" ADD COLUMN "custom_name" varchar;--> statement-breakpoint
ALTER TABLE "bridge_cpm_meal_period_items" ADD CONSTRAINT "bridge_cpm_meal_period_items_meal_period_id_bridge_cpm_meal_periods_id_fk" FOREIGN KEY ("meal_period_id") REFERENCES "public"."bridge_cpm_meal_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridge_cpm_meal_period_items" ADD CONSTRAINT "bridge_cpm_meal_period_items_item_id_d_cpm_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."d_cpm_items"("id") ON DELETE restrict ON UPDATE no action;