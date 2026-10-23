/*
# Create clothing_items table for StyleStock AI

1. New Tables
- `clothing_items`
  - `id` (uuid, primary key)
  - `title` (text) - titre du vêtement
  - `brand` (text) - marque identifiée
  - `category` (text) - type de vêtement (pull, pantalon, robe, etc.)
  - `model` (text) - modèle si identifiable
  - `size` (text) - taille identifiée
  - `color` (text) - couleur principale
  - `material` (text) - matière
  - `condition` (text) - état (neuf, très bon, bon, correct)
  - `defects` (text) - défauts éventuels
  - `purchase_price` (numeric) - prix d'achat (facultatif)
  - `selling_price` (numeric) - prix de vente conseillé
  - `hashtags` (text[]) - hashtags pour l'annonce
  - `description` (text) - description générée par l'IA
  - `vinted_title` (text) - titre optimisé pour Vinted
  - `status` (text) - statut: a_verifier, annonce_prete, en_ligne, vendu
  - `photos` (text[]) - URLs des photos stockées
  - `ai_confidence` (text) - niveau de confiance de l'IA (bas, moyen, eleve)
  - `ai_notes` (text) - notes sur les incertitudes de l'IA
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `clothing_items`.
- Grant CRUD to `anon` + `authenticated` so the Data API can reach the table.
- Allow anon + authenticated CRUD because the app is single-tenant (no sign-in).

3. Indexes
- Index on `title` for search
- Index on `brand` for search
- Index on `status` for filtering
- Index on `created_at` for ordering
*/

CREATE TABLE IF NOT EXISTS clothing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  brand text,
  category text,
  model text,
  size text,
  color text,
  material text,
  condition text,
  defects text,
  purchase_price numeric(10,2),
  selling_price numeric(10,2),
  hashtags text[] DEFAULT '{}',
  description text,
  vinted_title text,
  status text NOT NULL DEFAULT 'a_verifier',
  photos text[] DEFAULT '{}',
  ai_confidence text,
  ai_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON clothing_items TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_clothing" ON clothing_items;
CREATE POLICY "anon_select_clothing" ON clothing_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clothing" ON clothing_items;
CREATE POLICY "anon_insert_clothing" ON clothing_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clothing" ON clothing_items;
CREATE POLICY "anon_update_clothing" ON clothing_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clothing" ON clothing_items;
CREATE POLICY "anon_delete_clothing" ON clothing_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_clothing_title ON clothing_items (title);
CREATE INDEX IF NOT EXISTS idx_clothing_brand ON clothing_items (brand);
CREATE INDEX IF NOT EXISTS idx_clothing_status ON clothing_items (status);
CREATE INDEX IF NOT EXISTS idx_clothing_created ON clothing_items (created_at DESC);
