-- Grant execute permissions on database functions to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.is_beta_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_beta_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_beta_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_beta_role(uuid) TO anon;