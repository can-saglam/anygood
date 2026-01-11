-- Supabase Setup for Anygood Content Management
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: curated_picks
-- Stores manually curated content for each category
CREATE TABLE IF NOT EXISTS curated_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('read', 'listen', 'watch', 'eat', 'do')),
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  image_url TEXT,
  author TEXT, -- e.g., "Rick Rubin" for books, "Celine Song" for films
  curator_note TEXT, -- Your personal note about why it's good
  tags TEXT[], -- Array of tags for filtering/categorization
  priority INTEGER DEFAULT 0, -- Higher number = shows first (use 1-10 range)
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- For multi-curator support later (optional)
);

-- Table: rss_sources
-- Manage RSS feed sources via Supabase instead of hardcoding
CREATE TABLE IF NOT EXISTS rss_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('read', 'listen', 'watch', 'eat', 'do')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Lower number = fetched first
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_curated_picks_category ON curated_picks(category);
CREATE INDEX IF NOT EXISTS idx_curated_picks_published ON curated_picks(is_published, priority DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_sources_category ON rss_sources(category);
CREATE INDEX IF NOT EXISTS idx_rss_sources_active ON rss_sources(is_active, priority);

-- Enable Row Level Security
ALTER TABLE curated_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can read published content)
CREATE POLICY "Public read access for published picks" ON curated_picks
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public read access for active sources" ON rss_sources
  FOR SELECT USING (is_active = true);

-- Insert default RSS sources
INSERT INTO rss_sources (category, name, url, is_active, priority) VALUES
  -- READ sources
  ('read', 'The Guardian Books', 'https://www.theguardian.com/books/rss', true, 1),
  ('read', 'London Review of Books', 'https://www.lrb.co.uk/feed', true, 2),
  ('read', 'Literary Hub', 'https://lithub.com/feed/', true, 3),
  
  -- LISTEN sources
  ('listen', 'Resident Advisor Events', 'https://ra.co/xml/eventlistings.xml', true, 1),
  ('listen', 'The Quietus Music', 'https://thequietus.com/feed', true, 2),
  ('listen', 'Pitchfork Reviews', 'https://pitchfork.com/rss/reviews/albums/', true, 3),
  
  -- WATCH sources
  ('watch', 'Little White Lies', 'https://lwlies.com/feed/', true, 1),
  ('watch', 'The Guardian Film', 'https://www.theguardian.com/film/rss', true, 2),
  ('watch', 'BFI', 'https://www.bfi.org.uk/rss', true, 3),
  
  -- EAT sources
  ('eat', 'Hot Dinners London', 'https://www.hot-dinners.com/feed', true, 1),
  ('eat', 'London Eater', 'https://london.eater.com/rss/index.xml', true, 2),
  ('eat', 'Timeout London Food', 'https://www.timeout.com/london/restaurants/rss.xml', true, 3),
  
  -- DO sources
  ('do', 'Londonist Events', 'https://londonist.com/feed', true, 1),
  ('do', 'Time Out London', 'https://www.timeout.com/london/feed', true, 2),
  ('do', 'Eventbrite London', 'https://www.eventbrite.co.uk/rss/london', true, 3)
ON CONFLICT DO NOTHING;

-- Insert sample curated picks (you can replace these with your own)
INSERT INTO curated_picks (category, title, description, link, author, priority, is_published) VALUES
  -- READ samples
  ('read', 'Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin - A novel about two friends and the video game they create. A beautiful meditation on friendship, creativity, and resilience.', 'https://www.goodreads.com/book/show/58784475', 'Gabrielle Zevin', 10, true),
  ('read', 'The Creative Act: A Way of Being', 'Rick Rubin - Essential reading for any creative person. Wisdom from one of music''s greatest producers.', 'https://www.penguinrandomhouse.com/books/717356/', 'Rick Rubin', 9, true),
  ('read', 'How to Do Nothing', 'Jenny Odell - Resisting the attention economy. A manifesto for reclaiming your time and attention.', 'https://www.penguinrandomhouse.com/books/600671/', 'Jenny Odell', 8, true),
  
  -- LISTEN samples
  ('listen', 'Overmono - Good Lies', 'UK electronic duo''s debut album blending garage and breaks. Essential listening for fans of UK dance music.', 'https://overmono.lnk.to/GoodLies', 'Overmono', 10, true),
  ('listen', 'The Lot Radio', 'Independent online radio broadcasting live from a shipping container in Brooklyn. Always something interesting on.', 'https://thelotradio.com', 'The Lot Radio', 9, true),
  
  -- WATCH samples
  ('watch', 'Past Lives', 'Celine Song - A deeply moving film about childhood friends reuniting. One of the best films of the year.', 'https://www.imdb.com/title/tt13238346/', 'Celine Song', 10, true),
  
  -- EAT samples
  ('eat', 'Rochelle Canteen', 'Arnold Circus, Shoreditch - Simple British cooking in a beautiful space inside the Rochelle School. Book ahead.', 'https://www.arnoldandhenderson.com', 'Margot Henderson', 10, true),
  
  -- DO samples
  ('do', 'Barbican Conservatory', 'Hidden tropical oasis in the heart of the City. Free on Sundays, but you need to book ahead.', 'https://www.barbican.org.uk/visit/conservatory', 'Barbican Centre', 10, true)
ON CONFLICT DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on curated_picks
DROP TRIGGER IF EXISTS update_curated_picks_updated_at ON curated_picks;
CREATE TRIGGER update_curated_picks_updated_at
    BEFORE UPDATE ON curated_picks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on rss_sources
DROP TRIGGER IF EXISTS update_rss_sources_updated_at ON rss_sources;
CREATE TRIGGER update_rss_sources_updated_at
    BEFORE UPDATE ON rss_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Anygood Supabase setup completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Copy your Supabase URL and anon key from Settings > API';
  RAISE NOTICE '2. Configure them in the app (see SETUP.md)';
  RAISE NOTICE '3. Start adding your curated picks!';
END $$;
