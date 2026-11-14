-- Perfil público dos usuários: só id + nome (o e-mail continua privado em auth.users).
-- Qualquer usuário logado pode ler os nomes; cada um pode editar o próprio.

create table if not exists public.sistema_usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  nome text not null
);

alter table public.sistema_usuario enable row level security;

drop policy if exists "nomes visiveis para usuarios logados" on public.sistema_usuario;
create policy "nomes visiveis para usuarios logados"
  on public.sistema_usuario for select
  to authenticated
  using (true);

drop policy if exists "usuario edita o proprio nome" on public.sistema_usuario;
create policy "usuario edita o proprio nome"
  on public.sistema_usuario for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, update (nome) on public.sistema_usuario to authenticated;

-- Novo usuário em auth.users -> cria o perfil (nome = metadata.nome ou parte do e-mail antes do @)
create or replace function public.criar_sistema_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sistema_usuario (id, nome)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sistema_usuario on auth.users;
create trigger on_auth_user_created_sistema_usuario
  after insert on auth.users
  for each row execute function public.criar_sistema_usuario();

-- Usuários que já existem
insert into public.sistema_usuario (id, nome)
select id, split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- A função só serve ao trigger: não deve ser chamável via /rest/v1/rpc
revoke execute on function public.criar_sistema_usuario() from public, anon, authenticated;
