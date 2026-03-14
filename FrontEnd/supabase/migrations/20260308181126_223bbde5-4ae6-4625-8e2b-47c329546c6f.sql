
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Create articles table
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'nashik',
  location TEXT DEFAULT '',
  author TEXT NOT NULL DEFAULT 'Staff Reporter',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_breaking BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  views INTEGER NOT NULL DEFAULT 0,
  read_time INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Anyone can read published articles" ON public.articles
  FOR SELECT USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage articles" ON public.articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to increment article views
CREATE OR REPLACE FUNCTION public.increment_views(article_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.articles SET views = views + 1 WHERE id = article_id;
$$;

-- Storage bucket for article images
INSERT INTO storage.buckets (id, name, public) VALUES ('article-images', 'article-images', true);

-- Storage policies
CREATE POLICY "Public can view article images" ON storage.objects
  FOR SELECT USING (bucket_id = 'article-images');

CREATE POLICY "Admins can upload article images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update article images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete article images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'));
