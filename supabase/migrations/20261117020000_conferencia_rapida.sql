-- Conferência rápida: mesma estrutura da conferência normal, mas os itens são digitados na hora
-- (nome/código/marca no próprio registro), sem criar nada no cadastro de itens.

alter table public.conf_conferencia
  add column if not exists tipo varchar not null default 'normal';
alter table public.conf_conferencia drop constraint if exists conf_conferencia_tipo_check;
alter table public.conf_conferencia
  add constraint conf_conferencia_tipo_check check (tipo in ('normal', 'rapida'));

alter table public.conf_registro
  add column if not exists item_nome varchar,
  add column if not exists item_codigo varchar,
  add column if not exists item_marca uuid references public.cad_marca(id) on delete restrict,
  add column if not exists item_tipo_contagem varchar;

alter table public.conf_registro drop constraint if exists conf_registro_item_ou_avulso_check;
alter table public.conf_registro
  add constraint conf_registro_item_ou_avulso_check
  check (item is not null or nullif(trim(item_nome), '') is not null);

create index if not exists conf_conferencia_tipo_idx on public.conf_conferencia (tipo);
create index if not exists conf_registro_item_marca_idx on public.conf_registro (item_marca);

notify pgrst, 'reload schema';
