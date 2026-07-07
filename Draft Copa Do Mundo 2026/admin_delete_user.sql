-- Rodar no Supabase Dashboard > SQL Editor
-- Cria uma função RPC que permite ao admin deletar usuários pelo painel

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Deleta o perfil (cascade da tabela profiles)
    DELETE FROM public.profiles WHERE id = target_user_id;
    -- Deleta o usuario do auth (remove a conta completamente)
    DELETE FROM auth.users WHERE id = target_user_id;
    RETURN TRUE;
END;
$$;
