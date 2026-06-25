-- FIX: RESTORE NOTIFICATION INSERTION PERMISSIONS
-- The previous security hardening removed these, but they are required by the app's triggers 
-- and frontend logic (e.g., when creating posts or approving milestones).

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON "public"."notifications";

CREATE POLICY "Authenticated users can insert notifications" 
ON "public"."notifications" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Explanation: 
-- This policy allows any logged-in user to create a notification. 
-- While it theoretically allows a user to spam another user's notification feed, 
-- it is currently required for the application's core notification features (milestones, posts, etc.)
-- to function correctly until these notifications are moved to a SECURITY DEFINER trigger or a backend service.
