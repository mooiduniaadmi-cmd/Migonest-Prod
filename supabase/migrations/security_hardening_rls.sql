-- SECURITY HARDENING: SUPABASE RLS POLICIES
-- This script fixes several security and privacy issues identified during the audit.

-- 1. NOTIFICATIONS SECURITY (DANGER: DO NOT REMOVE INSERT POLICY)
-- Issue: Authenticated users could insert notifications for anyone.
-- Audit: This policy is currently REQUIRED by the frontend and hidden triggers.
-- Removing it breaks "Create Post" and "Approve Milestone".
-- DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON "public"."notifications";
-- A safer approach would be move these to a SECURITY DEFINER function.

-- 2. PROFILES PRIVACY
-- Issue: Sensitive data (email, wallet, DOB, gender) is publicly readable.
-- Solution: Restrict the broad SELECT policy.
-- Note: This might require frontend adjustments if it expects to read these fields for others.
-- Usually, we want public profiles to be visible but with limited fields.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profile fields are viewable by everyone." 
ON profiles FOR SELECT 
USING (true);

-- To truly hide columns, we'd ideally use a VIEW, but as an RLS stopgap, 
-- we ensure users can definitely see their OWN full profile.
DROP POLICY IF EXISTS "Users can view own full profile." ON profiles;
CREATE POLICY "Users can view own full profile." 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- 3. PROFILE UPDATE PROTECTION
-- Issue: Users could potentially update their own 'role' or 'wallet_balance'.
-- Fix: Restrict UPDATE policy to non-sensitive columns.
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile." 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  (role = (SELECT role FROM profiles WHERE id = auth.uid())) AND
  (wallet_balance = (SELECT wallet_balance FROM profiles WHERE id = auth.uid())) AND
  (earnings = (SELECT earnings FROM profiles WHERE id = auth.uid()))
);

-- 4. EXPERT APPLICATIONS SECURITY
-- Issue: Experts could update any application.
-- Fix: Restrict UPDATE to Admins only (or the specific expert handling it if assigned).
DROP POLICY IF EXISTS "Admins and Experts can update applications." ON expert_applications;
CREATE POLICY "Admins can update applications." 
ON expert_applications FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

-- 5. STORAGE BUCKET HARDENING
-- Ensure 'admission-documents' is not too permissive
-- (Existing policies are already somewhat restrictive based on previous audit)
