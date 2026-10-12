-- A professional who joined through a partner's link can choose to let that partner
-- see their business name. Default off, so nothing is shared until they opt in.
ALTER TABLE "professionals" ADD COLUMN "share_name_with_partner" BOOLEAN NOT NULL DEFAULT false;
