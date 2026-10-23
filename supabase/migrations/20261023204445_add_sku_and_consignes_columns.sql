/*
# Add sku and consignes columns to clothing_items

1. Modified Tables
- `clothing_items`
  - `sku` (text) - référence unique générée automatiquement (ex: LAC-451, RL-12)
  - `consignes` (text) - consignes personnalisées ajoutées à l'annonce par l'utilisateur

2. Notes
- Both columns are nullable (existing items won't have them)
- No data loss: ALTER TABLE ADD COLUMN only adds new columns
*/

ALTER TABLE clothing_items ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE clothing_items ADD COLUMN IF NOT EXISTS consignes text;
