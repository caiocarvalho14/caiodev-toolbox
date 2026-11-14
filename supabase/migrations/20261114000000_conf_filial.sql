-- Filiais do módulo conferência + vínculo da conferência com a filial

create table if not exists public.conf_filial (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome varchar not null,
  criador_id uuid default auth.uid() references auth.users(id) on delete set null
);
create index if not exists conf_filial_criador_id_idx on public.conf_filial (criador_id);

alter table public.conf_filial enable row level security;
drop policy if exists "usuario_tem_acesso_rota" on public.conf_filial;
create policy "usuario_tem_acesso_rota"
  on public.conf_filial for all
  to authenticated
  using (usuario_tem_acesso_rota('/conferencia'::text));

-- on delete restrict: não dá para apagar uma filial que ainda tem conferências
alter table public.conf_conferencia
  add column if not exists filial uuid references public.conf_filial(id) on delete restrict;
create index if not exists conf_conferencia_filial_idx on public.conf_conferencia (filial);

-- Dados iniciais: FILIAL 03 recebe todas as conferências sem filial
with nova as (
  insert into public.conf_filial (nome)
  select 'FILIAL 03'
  where not exists (select 1 from public.conf_filial where nome = 'FILIAL 03')
  returning id
), alvo as (
  select id from nova
  union all
  select id from public.conf_filial where nome = 'FILIAL 03'
  limit 1
)
update public.conf_conferencia set filial = (select id from alvo) where filial is null;

notify pgrst, 'reload schema';
