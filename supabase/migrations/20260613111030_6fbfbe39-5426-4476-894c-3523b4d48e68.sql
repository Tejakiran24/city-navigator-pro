CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Users view own roles" ON public.user_roles;
DROP POLICY "Admins manage roles" ON public.user_roles;
DROP POLICY "Admins manage intersections" ON public.intersections;
DROP POLICY "Admins manage roads" ON public.roads;
DROP POLICY "Users manage own route searches" ON public.route_searches;
DROP POLICY "Users manage own saved routes" ON public.saved_routes;
DROP POLICY "Admins manage alerts" ON public.traffic_alerts;
DROP POLICY "Users manage own notifications" ON public.notifications;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage intersections" ON public.intersections FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roads" ON public.roads FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own route searches" ON public.route_searches FOR ALL TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own saved routes" ON public.saved_routes FOR ALL TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage alerts" ON public.traffic_alerts FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION public.has_role(uuid, public.app_role);
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;