
-- Notes table for long-term memory/second brain
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notes" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notes" ON public.notes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete notes" ON public.notes FOR DELETE USING (true);

-- Reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reminders" ON public.reminders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reminders" ON public.reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reminders" ON public.reminders FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete reminders" ON public.reminders FOR DELETE USING (true);
