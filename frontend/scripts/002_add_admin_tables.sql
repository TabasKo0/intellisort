-- Create admin_users table to track admin privileges
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin_users table
CREATE POLICY "Only admins can view admin users"
  ON public.admin_users FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_admin = TRUE));

-- Create system_analytics table to track aggregate statistics
CREATE TABLE IF NOT EXISTS public.system_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_users INT DEFAULT 0,
  total_classifications INT DEFAULT 0,
  avg_confidence FLOAT DEFAULT 0,
  most_common_category TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on system_analytics
ALTER TABLE public.system_analytics ENABLE ROW LEVEL SECURITY;

-- Allow admins to view system analytics
CREATE POLICY "Allow admins to view system analytics"
  ON public.system_analytics FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_admin = TRUE));
