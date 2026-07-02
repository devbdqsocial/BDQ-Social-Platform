-- Legacy template system removed: EventMap (map library) is the one reusable-layout model.
-- Existing LayoutTemplate rows were folded into EventMap beforehand (backfill keyed on
-- legacyTemplateId); local had 1 (already folded), prod had 0.
ALTER TABLE "EventMap" DROP COLUMN IF EXISTS "legacyTemplateId";
DROP TABLE IF EXISTS "LayoutTemplate";
