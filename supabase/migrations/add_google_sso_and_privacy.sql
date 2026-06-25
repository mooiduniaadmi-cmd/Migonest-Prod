-- ADD GOOGLE SSO SUPPORT AND DOB/GENDER PRIVACY FIELDS

-- 1. Add fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_dob_private BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_gender_private BOOLEAN DEFAULT TRUE;

-- 2. Update the handle_new_user trigger to populate auth_provider and defaults
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
    is_onboarded,
    auth_provider,
    is_dob_private,
    is_gender_private
  )
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'), 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    CASE 
      WHEN (new.raw_user_meta_data->>'dob') ~ '^\d{4}-\d{2}-\d{2}$' 
      THEN (new.raw_user_meta_data->>'dob')::DATE 
      ELSE NULL 
    END,
    new.raw_user_meta_data->>'gender',
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''), 
    'STUDENT',
    false,
    COALESCE(new.raw_app_meta_data->>'provider', 'email'),
    true,
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
