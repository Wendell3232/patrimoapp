REVOKE EXECUTE ON FUNCTION public.ensure_profile(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bootstrap_user_data(text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_user_data(text, text) TO authenticated;