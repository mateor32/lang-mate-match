-- Crear tabla de perfiles de usuarios
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  idioma_nativo TEXT NOT NULL,
  idioma_aprender TEXT NOT NULL,
  foto_perfil TEXT,
  pais TEXT,
  bio TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  id_usuario2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'bloqueado')),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id_usuario1, id_usuario2)
);

-- Crear tabla de mensajes
CREATE TABLE public.mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_match UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  id_remitente UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de likes
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario_origen UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  id_usuario_destino UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id_usuario_origen, id_usuario_destino)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Los perfiles son visibles para todos los usuarios autenticados"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Políticas para likes
CREATE POLICY "Los usuarios pueden ver los likes que recibieron"
  ON public.likes FOR SELECT
  TO authenticated
  USING (auth.uid() = id_usuario_destino OR auth.uid() = id_usuario_origen);

CREATE POLICY "Los usuarios pueden dar like"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id_usuario_origen);

-- Políticas para matches
CREATE POLICY "Los usuarios pueden ver sus propios matches"
  ON public.matches FOR SELECT
  TO authenticated
  USING (auth.uid() = id_usuario1 OR auth.uid() = id_usuario2);

CREATE POLICY "Los usuarios pueden crear matches"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id_usuario1 OR auth.uid() = id_usuario2);

-- Políticas para mensajes
CREATE POLICY "Los usuarios pueden ver mensajes de sus matches"
  ON public.mensajes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = mensajes.id_match
      AND (matches.id_usuario1 = auth.uid() OR matches.id_usuario2 = auth.uid())
    )
  );

CREATE POLICY "Los usuarios pueden enviar mensajes en sus matches"
  ON public.mensajes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id_remitente AND
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = id_match
      AND (matches.id_usuario1 = auth.uid() OR matches.id_usuario2 = auth.uid())
    )
  );

CREATE POLICY "Los usuarios pueden actualizar sus mensajes"
  ON public.mensajes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = mensajes.id_match
      AND (matches.id_usuario1 = auth.uid() OR matches.id_usuario2 = auth.uid())
    )
  );

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email, idioma_nativo, idioma_aprender, foto_perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'idioma_nativo', 'Español'),
    COALESCE(NEW.raw_user_meta_data->>'idioma_aprender', 'Inglés'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Función para crear match automático cuando hay like mutuo
CREATE OR REPLACE FUNCTION public.check_mutual_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar si existe un like inverso
  IF EXISTS (
    SELECT 1 FROM public.likes
    WHERE id_usuario_origen = NEW.id_usuario_destino
    AND id_usuario_destino = NEW.id_usuario_origen
  ) THEN
    -- Crear match si no existe
    INSERT INTO public.matches (id_usuario1, id_usuario2)
    VALUES (
      LEAST(NEW.id_usuario_origen, NEW.id_usuario_destino),
      GREATEST(NEW.id_usuario_origen, NEW.id_usuario_destino)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para verificar match al dar like
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mutual_like();

-- Habilitar realtime para mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;