CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.traffic_level AS ENUM ('low', 'medium', 'heavy', 'closed');
CREATE TYPE public.route_algorithm AS ENUM ('dijkstra', 'astar', 'bfs', 'dfs');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  avatar_url text,
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.intersections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_code text NOT NULL UNIQUE CHECK (char_length(node_code) BETWEEN 1 AND 20),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intersections TO authenticated;
GRANT ALL ON public.intersections TO service_role;
ALTER TABLE public.intersections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view intersections" ON public.intersections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage intersections" ON public.intersections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER intersections_updated_at BEFORE UPDATE ON public.intersections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.roads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  start_node uuid NOT NULL REFERENCES public.intersections(id) ON DELETE CASCADE,
  end_node uuid NOT NULL REFERENCES public.intersections(id) ON DELETE CASCADE,
  distance_km numeric(8,2) NOT NULL CHECK (distance_km > 0),
  base_time_minutes numeric(8,2) NOT NULL CHECK (base_time_minutes > 0),
  traffic_level public.traffic_level NOT NULL DEFAULT 'low',
  traffic_weight numeric(5,2) NOT NULL DEFAULT 1 CHECK (traffic_weight >= 1),
  bidirectional boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_node <> end_node)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roads TO authenticated;
GRANT ALL ON public.roads TO service_role;
ALTER TABLE public.roads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view roads" ON public.roads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roads" ON public.roads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX roads_start_node_idx ON public.roads(start_node);
CREATE INDEX roads_end_node_idx ON public.roads(end_node);
CREATE TRIGGER roads_updated_at BEFORE UPDATE ON public.roads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.route_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid NOT NULL REFERENCES public.intersections(id),
  destination_id uuid NOT NULL REFERENCES public.intersections(id),
  algorithm public.route_algorithm NOT NULL,
  distance_km numeric(8,2) NOT NULL CHECK (distance_km >= 0),
  travel_time_minutes numeric(8,2) NOT NULL CHECK (travel_time_minutes >= 0),
  junction_count integer NOT NULL CHECK (junction_count >= 0),
  fuel_liters numeric(8,2) NOT NULL DEFAULT 0 CHECK (fuel_liters >= 0),
  traffic_status public.traffic_level NOT NULL DEFAULT 'low',
  path jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.route_searches TO authenticated;
GRANT ALL ON public.route_searches TO service_role;
ALTER TABLE public.route_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own route searches" ON public.route_searches FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);
CREATE INDEX route_searches_user_idx ON public.route_searches(user_id, created_at DESC);

CREATE TABLE public.saved_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  source_id uuid NOT NULL REFERENCES public.intersections(id),
  destination_id uuid NOT NULL REFERENCES public.intersections(id),
  algorithm public.route_algorithm NOT NULL DEFAULT 'dijkstra',
  path jsonb NOT NULL DEFAULT '[]'::jsonb,
  distance_km numeric(8,2) NOT NULL DEFAULT 0,
  travel_time_minutes numeric(8,2) NOT NULL DEFAULT 0,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_routes TO authenticated;
GRANT ALL ON public.saved_routes TO service_role;
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved routes" ON public.saved_routes FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);
CREATE INDEX saved_routes_user_idx ON public.saved_routes(user_id);
CREATE TRIGGER saved_routes_updated_at BEFORE UPDATE ON public.saved_routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.favorite_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  intersection_id uuid NOT NULL REFERENCES public.intersections(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, intersection_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_locations TO authenticated;
GRANT ALL ON public.favorite_locations TO service_role;
ALTER TABLE public.favorite_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorite locations" ON public.favorite_locations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.traffic_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  severity public.traffic_level NOT NULL,
  road_id uuid REFERENCES public.roads(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'traffic' CHECK (category IN ('traffic', 'closure', 'emergency', 'weather', 'system')),
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_alerts TO authenticated;
GRANT ALL ON public.traffic_alerts TO service_role;
ALTER TABLE public.traffic_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view alerts" ON public.traffic_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage alerts" ON public.traffic_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER traffic_alerts_updated_at BEFORE UPDATE ON public.traffic_alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  category text NOT NULL DEFAULT 'system' CHECK (category IN ('traffic', 'closure', 'emergency', 'route', 'system')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);