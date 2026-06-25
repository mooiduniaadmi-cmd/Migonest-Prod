-- Add reposts count to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reposts INTEGER DEFAULT 0;

-- Create post_reposts table
CREATE TABLE IF NOT EXISTS post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can repost posts." ON post_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can undo reposts." ON post_reposts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view reposts." ON post_reposts FOR SELECT USING (true);

-- Atomic increment function
CREATE OR REPLACE FUNCTION increment_post_reposts(post_id_arg UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET reposts = reposts + 1 WHERE id = post_id_arg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic decrement function
CREATE OR REPLACE FUNCTION decrement_post_reposts(post_id_arg UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET reposts = GREATEST(reposts - 1, 0) WHERE id = post_id_arg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
