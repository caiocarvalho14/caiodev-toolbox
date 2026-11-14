-- Adiciona criador_id em todas as tabelas do módulo conferência (conf_*).
-- Preenchido automaticamente com o usuário logado (auth.uid()) em novos inserts.
-- Linhas já existentes ficam com NULL.

do $$
declare
  t text;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name like 'conf\_%'
  loop
    execute format(
      'alter table public.%I
         add column if not exists criador_id uuid
           default auth.uid()
           references auth.users(id) on delete set null',
      t
    );
    execute format(
      'create index if not exists %I on public.%I (criador_id)',
      t || '_criador_id_idx', t
    );
  end loop;
end $$;

-- Recarrega o cache de schema do PostgREST para a coluna aparecer na API
notify pgrst, 'reload schema';
