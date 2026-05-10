-- ============================================================
-- 1. CHAMP ROLE SUR LES PROFILS UTILISATEURS
-- ============================================================
-- Ajoute un champ role à la table profiles existante
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'standard'
CHECK (role IN ('standard', 'provider', 'admin'));

-- ============================================================
-- 2. TABLE PROVIDER_PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  admin_note TEXT,
  -- Zone géographique (JSONB flexible)
  zone JSONB NOT NULL DEFAULT '{"country": "France"}'::jsonb,
  -- Photos (tableau d'URLs)
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_range TEXT,
  -- Caractéristiques spécifiques à la catégorie
  specifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Périodes d'indisponibilité
  unavailabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Statistiques calculées
  average_rating NUMERIC(3,2),
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un seul profil prestataire par utilisateur
  UNIQUE(user_id)
);

-- ============================================================
-- 3. TABLE PROVIDER_DOCUMENTS (justificatifs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other'
    CHECK (type IN ('kbis', 'insurance', 'portfolio', 'certification', 'other')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. TABLE PROVIDER_REVIEWS (avis)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  event_id TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un seul avis par utilisateur par prestataire
  UNIQUE(provider_id, author_id)
);

-- ============================================================
-- 5. TABLE PROVIDER_CONVERSATIONS (messagerie)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provider_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  organiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_provider INTEGER NOT NULL DEFAULT 0,
  unread_count_organiser INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, organiser_id)
);

-- ============================================================
-- 6. TABLE PROVIDER_MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provider_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.provider_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. TABLE APPOINTMENTS (rendez-vous)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.provider_conversations(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  organiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video', 'in_person')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  location TEXT,
  video_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. TABLE ADMIN_ACTIONS (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. TRIGGER updated_at sur provider_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_provider_profiles_updated_at ON public.provider_profiles;
CREATE TRIGGER set_provider_profiles_updated_at
  BEFORE UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 10. TRIGGER mise à jour note moyenne après un avis
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.provider_profiles
  SET
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.provider_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.provider_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
    )
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rating_on_review ON public.provider_reviews;
CREATE TRIGGER update_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.provider_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_rating();

-- ============================================================
-- 11. TRIGGER mise à jour last_message dans conversations
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.provider_conversations
  SET
    last_message = NEW.content,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_last_message ON public.provider_messages;
CREATE TRIGGER update_last_message
  AFTER INSERT ON public.provider_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- provider_profiles : visible par tous si approved, modifiable par le owner
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profils approuvés visibles par tous" ON public.provider_profiles
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Owner voit son propre profil" ON public.provider_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner peut créer son profil" ON public.provider_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner peut modifier son profil" ON public.provider_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- provider_documents : owner uniquement
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner voit ses documents" ON public.provider_documents
  FOR SELECT USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner peut uploader des documents" ON public.provider_documents
  FOR INSERT WITH CHECK (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

-- provider_reviews : lecture publique, écriture authentifiée
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avis visibles par tous" ON public.provider_reviews
  FOR SELECT USING (true);

CREATE POLICY "Utilisateur connecté peut laisser un avis" ON public.provider_reviews
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- provider_conversations : visible par les deux participants
ALTER TABLE public.provider_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants voient leurs conversations" ON public.provider_conversations
  FOR SELECT USING (
    auth.uid() = organiser_id OR
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles WHERE id = provider_id
    )
  );

CREATE POLICY "Organisateur peut créer une conversation" ON public.provider_conversations
  FOR INSERT WITH CHECK (auth.uid() = organiser_id);

-- provider_messages : visible par les participants de la conversation
ALTER TABLE public.provider_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants voient les messages" ON public.provider_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.provider_conversations
      WHERE auth.uid() = organiser_id
      OR auth.uid() IN (
        SELECT user_id FROM public.provider_profiles WHERE id = provider_id
      )
    )
  );

CREATE POLICY "Participants peuvent envoyer des messages" ON public.provider_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- appointments : visible par les deux participants
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants voient leurs RDV" ON public.appointments
  FOR SELECT USING (
    auth.uid() = organiser_id OR
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles WHERE id = provider_id
    )
  );

CREATE POLICY "Organisateur peut créer un RDV" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = organiser_id);

CREATE POLICY "Participants peuvent modifier le statut RDV" ON public.appointments
  FOR UPDATE USING (
    auth.uid() = organiser_id OR
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles WHERE id = provider_id
    )
  );

-- admin_actions : admins uniquement (géré côté service role dans l'app admin)
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins voient les actions" ON public.admin_actions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE id IN (SELECT id FROM public.profiles WHERE role = 'admin')
    )
  );

-- ============================================================
-- 13. INDEX pour les performances
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_provider_profiles_status
  ON public.provider_profiles(status);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_category
  ON public.provider_profiles(category);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_user_id
  ON public.provider_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_provider_messages_conversation
  ON public.provider_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_conversations_organiser
  ON public.provider_conversations(organiser_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date
  ON public.appointments(date);
