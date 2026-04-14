/*
  # Create Tournament App Schema

  1. New Tables
    - `tournaments`
      - `id` (uuid, primary key) - Unique tournament identifier
      - `title` (text) - Tournament title (in Turkish)
      - `cover_image` (text) - URL to cover image
      - `bracket_size` (integer) - Size of bracket (8, 16, 32)
      - `play_count` (integer) - Number of times played
      - `created_at` (timestamptz) - Creation timestamp
      - `is_trending` (boolean) - Whether tournament is trending
    
    - `tournament_items`
      - `id` (uuid, primary key) - Unique item identifier
      - `tournament_id` (uuid, foreign key) - Reference to tournament
      - `image_url` (text) - URL to item image
      - `name` (text) - Item name
      - `win_count` (integer) - Total wins for leaderboard
      - `total_count` (integer) - Total appearances for win rate
      - `created_at` (timestamptz) - Creation timestamp
    
    - `votes`
      - `id` (uuid, primary key) - Unique vote identifier
      - `tournament_id` (uuid, foreign key) - Reference to tournament
      - `item_id` (uuid, foreign key) - Reference to winning item
      - `created_at` (timestamptz) - Vote timestamp
  
  2. Security
    - Enable RLS on all tables
    - Allow public read access (no auth required)
    - Allow public write access for votes and tournament creation
  
  3. Indexes
    - Index on tournament_id for faster queries
    - Index on trending tournaments
*/

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  cover_image text NOT NULL,
  bracket_size integer NOT NULL DEFAULT 16,
  play_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  is_trending boolean DEFAULT false
);

-- Create tournament_items table
CREATE TABLE IF NOT EXISTS tournament_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  name text NOT NULL,
  win_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES tournament_items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tournaments"
  ON tournaments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for tournament_items
CREATE POLICY "Anyone can view tournament items"
  ON tournament_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create tournament items"
  ON tournament_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tournament items"
  ON tournament_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for votes
CREATE POLICY "Anyone can view votes"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create votes"
  ON votes FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_items_tournament_id ON tournament_items(tournament_id);
CREATE INDEX IF NOT EXISTS idx_votes_tournament_id ON votes(tournament_id);
CREATE INDEX IF NOT EXISTS idx_votes_item_id ON votes(item_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_trending ON tournaments(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at ON tournaments(created_at DESC);