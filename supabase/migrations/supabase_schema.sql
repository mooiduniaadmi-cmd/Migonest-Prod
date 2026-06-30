-- 1. SETUP ENUMS
CREATE TYPE user_role AS ENUM ('STUDENT', 'EXPERT', 'ADMIN');
CREATE TYPE admission_step AS ENUM (
  'REQUIREMENTS', 'DOCUMENTS', 'APPLICATION_FEE', 'APPLIED', 
  'ACCEPTANCE_LETTER', 'VISA', 'ADMITTED', 'ACCOMMODATION'
);
CREATE TYPE visa_outcome AS ENUM ('PENDING', 'APPROVED', 'DENIED');
CREATE TYPE wallet_entry_type AS ENUM ('PAYMENT', 'WITHDRAWAL', 'REFUND', 'UNLOCK', 'EARNING');

-- 2. PROFILES TABLE (Extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  slug TEXT UNIQUE,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  cover_photo_url TEXT,
  role user_role DEFAULT 'STUDENT',
  email TEXT,
  home_countries TEXT[],
  current_location TEXT,
  languages TEXT[],
  highest_qualifications TEXT[],
  interest_areas TEXT[],
  current_studies TEXT[],
  target_countries TEXT[],
  wallet_balance NUMERIC(10,2) DEFAULT 0.00,
  locked_balance NUMERIC(10,2) DEFAULT 0.00,
  earnings NUMERIC(10,2) DEFAULT 0.00,
  connections UUID[] DEFAULT '{}',
  is_subscribed BOOLEAN DEFAULT false,
  subscription_id TEXT,
  current_period_end BIGINT,
  dob DATE,
  gender TEXT,
  is_onboarded BOOLEAN DEFAULT false,
  common_documents JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SERVICE REQUESTS (The 8-Stage Roadmap)
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  expert_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'PENDING', -- PENDING, ACCEPTED, COMPLETED, PAID
  current_step admission_step DEFAULT 'REQUIREMENTS',
  completed_steps admission_step[] DEFAULT '{}',
  is_pending_student_confirmation BOOLEAN DEFAULT false,
  is_milestone_rejected BOOLEAN DEFAULT false,
  visa_status visa_outcome DEFAULT 'PENDING',
  fee NUMERIC(10,2) DEFAULT 599.00,
  platform_fee_pct NUMERIC DEFAULT 20,
  payment_plan TEXT DEFAULT 'ONE_TIME', -- 'ONE_TIME' or 'INSTALLMENTS'
  installments_paid INTEGER DEFAULT 0,
  stripe_subscription_id TEXT,
  is_locked BOOLEAN DEFAULT false,
  questionnaire JSONB,
  agreements JSONB,
  hiring_documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. DOCUMENTS (Locker & Journeys)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT, -- PDF, IMAGE, DOC
  timestamp BIGINT DEFAULT (extract(epoch from now()) * 1000)
);

-- 5. WALLET ENTRIES (Financial Ledger)
CREATE TABLE wallet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  type wallet_entry_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'COMPLETED',
  request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  counterparty_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  counterparty_name TEXT,
  counterparty_role TEXT,
  counterparty_avatar_url TEXT,
  university TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. COMMUNITY (Posts)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  timestamp BIGINT DEFAULT (extract(epoch from now()) * 1000)
);

-- 6b. POST LIKES (Track who liked what)
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 7. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'SYSTEM', -- SYSTEM, WALLET, ADMISSION, CHAT
  read BOOLEAN DEFAULT false,
  timestamp BIGINT DEFAULT (extract(epoch from now()) * 1000)
);

-- 8. EXPERT APPLICATIONS
CREATE TABLE expert_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  student_name TEXT,
  student_avatar_url TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  data JSONB,
  timestamp BIGINT DEFAULT (extract(epoch from now()) * 1000)
);

-- (Policies moved to Section 12)

-- 9. SECURITY RPC (Used by server.ts to update balances atomically)
CREATE OR REPLACE FUNCTION increment_wallet(row_id UUID, val NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = wallet_balance + val,
      earnings = CASE WHEN val > 0 THEN earnings + val ELSE earnings END
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. AUTOMATED TRIGGER (Create profile on Signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    first_name, 
    last_name, 
    dob, 
    gender, 
    avatar_url, 
    role,
    is_onboarded
  )
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    -- Safely handle malformed date strings from mobile
    CASE 
      WHEN (new.raw_user_meta_data->>'dob') ~ '^\d{4}-\d{2}-\d{2}$' 
      THEN (new.raw_user_meta_data->>'dob')::DATE 
      ELSE NULL 
    END,
    new.raw_user_meta_data->>'gender',
    '', 
    'STUDENT',
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 11. ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_entries ENABLE ROW LEVEL SECURITY;

-- 12. BASIC POLICIES
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can view posts." ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts." ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own posts." ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own posts." ON posts FOR DELETE USING (auth.uid() = author_id);
CREATE POLICY "Users can like posts." ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts." ON post_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view likes." ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can view their own notifications." ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own service requests." ON service_requests FOR SELECT USING (auth.uid() = student_id OR auth.uid() = expert_id);

-- Documents
CREATE POLICY "Users can view their own documents" ON documents FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can insert their own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can update their own documents" ON documents FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete their own documents" ON documents FOR DELETE USING (auth.uid() = uploaded_by);
CREATE POLICY "Participants can view journey documents" ON documents FOR SELECT USING (EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = documents.request_id AND (auth.uid() = sr.student_id OR auth.uid() = sr.expert_id)));

-- Wallet Entries
CREATE POLICY "Users can view their own wallet entries" ON wallet_entries FOR SELECT USING (auth.uid() = profile_id);

-- Expert Applications
CREATE POLICY "Admins and Experts can view all applications." ON expert_applications FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'ADMIN' OR profiles.role = 'EXPERT')));
CREATE POLICY "Users can view their own expert applications." ON expert_applications FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can insert their own expert applications." ON expert_applications FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins and Experts can update applications." ON expert_applications FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'ADMIN' OR profiles.role = 'EXPERT')));

-- 13. ATOMIC UPDATE FUNCTIONS
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET likes = likes + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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
-- 14. EXPERT ROLE ACTIVATION TRIGGER
CREATE OR REPLACE FUNCTION handle_expert_application_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'APPROVED' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
        UPDATE profiles
        SET role = 'EXPERT'::user_role
        WHERE id = NEW.student_id AND role = 'STUDENT'::user_role;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_expert_application_approved
    AFTER INSERT OR UPDATE ON expert_applications
    FOR EACH ROW
    EXECUTE FUNCTION handle_expert_application_approval();

-- 15. STORAGE BUCKET POLICIES (Run in Supabase SQL Editor if needed)
-- Note: Requires superuser permissions to modify storage.objects directly
/*
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Set up RLS for avatars
CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar User Management" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Set up RLS for covers
CREATE POLICY "Cover Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Cover User Management" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Set up RLS for documents
CREATE POLICY "Document User Access" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
*/

-- 16. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  content TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert messages as sender" ON messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their own messages" ON messages 
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can mark received messages as read" ON messages 
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Add real-time publication if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END
$$;


-- FIX: Notifications RLS (2025-02-02)
CREATE POLICY "Authenticated users can insert notifications" ON "public"."notifications" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FIX: Admission Documents Storage (2025-02-02)
INSERT INTO storage.buckets (id, name, public) VALUES ('admission-documents', 'admission-documents', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Authenticated users can upload admission docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'admission-documents');
CREATE POLICY "Public view admission docs" ON storage.objects FOR SELECT TO PUBLIC USING (bucket_id = 'admission-documents');

-- ==========================================
-- ANALYTICS EVENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    country TEXT,
    city TEXT,
    device_type TEXT,
    browser TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read analytics
CREATE POLICY "Admins can view analytics events" ON public.analytics_events
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'ADMIN'
        )
    );

-- Users can insert analytics via the authenticated API or service role,
-- so we can leave insert policy strict if we handle inserts via backend with service key.
-- But if we want to allow direct client inserts:
CREATE POLICY "Anyone can insert analytics" ON public.analytics_events
    FOR INSERT
    WITH CHECK (true);


-- Add privacy flags for DOB and Gender
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_dob_private BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_gender_private BOOLEAN DEFAULT false;
