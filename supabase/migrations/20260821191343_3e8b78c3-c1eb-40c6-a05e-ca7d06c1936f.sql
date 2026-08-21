REVOKE ALL PRIVILEGES ON FUNCTION public.handle_new_user() FROM public;
REVOKE ALL PRIVILEGES ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;