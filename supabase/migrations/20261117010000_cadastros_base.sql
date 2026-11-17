-- Cadastros base (itens, marcas, locais, filiais) deixam de pertencer ao módulo Conferência
-- e passam a ser um módulo próprio (/cadastros), usado como base pelos demais módulos.

-- 1. Renomeia as tabelas (FKs, RLS, índices e dados acompanham o rename)
alter table public.conf_item           rename to cad_item;
alter table public.conf_marca_item     rename to cad_marca;
alter table public.conf_local_contagem rename to cad_local;
alter table public.conf_filial         rename to cad_filial;

alter table public.cad_item   rename constraint confacougue_carne_pkey to cad_item_pkey;
alter table public.cad_marca  rename constraint confacougue_marca_carne_pkey to cad_marca_pkey;
alter table public.cad_local  rename constraint conf_local_contagem_pkey to cad_local_pkey;
alter table public.cad_filial rename constraint conf_filial_pkey to cad_filial_pkey;
alter table public.cad_item   rename constraint conf_item_marca_fkey to cad_item_marca_fkey;
alter index public.conf_item_criador_id_idx           rename to cad_item_criador_id_idx;
alter index public.conf_marca_item_criador_id_idx     rename to cad_marca_criador_id_idx;
alter index public.conf_local_contagem_criador_id_idx rename to cad_local_criador_id_idx;
alter index public.conf_filial_criador_id_idx         rename to cad_filial_criador_id_idx;

-- 2. Dado compartilhado não pode apagar histórico em cascata:
--    item/local/marca em uso por conferências (ou itens) não podem ser removidos.
alter table public.conf_registro drop constraint conf_registro_item_fkey,
  add constraint conf_registro_item_fkey foreign key (item) references public.cad_item(id) on delete restrict;
alter table public.conf_contagem drop constraint conf_contagem_local_fkey,
  add constraint conf_contagem_local_fkey foreign key (local) references public.cad_local(id) on delete restrict;
alter table public.cad_item drop constraint cad_item_marca_fkey,
  add constraint cad_item_marca_fkey foreign key (marca) references public.cad_marca(id) on delete restrict;
-- (conf_modelo_item.item segue em cascade: tirar um item do cadastro só o remove dos modelos)

-- 3. Nova rota/módulo e acesso para quem já usava a conferência
insert into public.sistema_rotas (nome, path, descricao, ativo)
select 'Cadastros', '/cadastros', 'Itens, marcas, locais e filiais usados pelos outros módulos.', true
where not exists (select 1 from public.sistema_rotas where path = '/cadastros');

insert into public.sistema_usuario_rota (usuario, rota)
select ur.usuario, cad.id
from public.sistema_usuario_rota ur
join public.sistema_rotas r on r.id = ur.rota and r.path = '/conferencia'
cross join (select id from public.sistema_rotas where path = '/cadastros') cad
where not exists (
  select 1 from public.sistema_usuario_rota x where x.usuario = ur.usuario and x.rota = cad.id
);

-- 4. Acesso: leitura para quem usa algum módulo que depende da base; escrita só pelo módulo Cadastros
do $$
declare
  t text;
begin
  foreach t in array array['cad_item', 'cad_marca', 'cad_local', 'cad_filial'] loop
    execute format('drop policy if exists "usuario_tem_acesso_rota" on public.%I', t);
    execute format('drop policy if exists "Usuário está logado e tem acesso a rota" on public.%I', t);
    execute format('drop policy if exists "leitura pelos modulos" on public.%I', t);
    execute format('drop policy if exists "escrita pelo modulo cadastros" on public.%I', t);
    execute format(
      'create policy "leitura pelos modulos" on public.%I for select to authenticated
         using (usuario_tem_acesso_rota(''/cadastros'') or usuario_tem_acesso_rota(''/conferencia''))', t);
    execute format(
      'create policy "escrita pelo modulo cadastros" on public.%I for all to authenticated
         using (usuario_tem_acesso_rota(''/cadastros'')) with check (usuario_tem_acesso_rota(''/cadastros''))', t);
  end loop;
end $$;

-- 5. Compatibilidade temporária: apps ainda abertos com a versão antiga (PWA/offline)
--    continuam lendo/gravando pelos nomes antigos. Remover quando todos atualizarem.
create or replace view public.conf_item           with (security_invoker = true) as select * from public.cad_item;
create or replace view public.conf_marca_item     with (security_invoker = true) as select * from public.cad_marca;
create or replace view public.conf_local_contagem with (security_invoker = true) as select * from public.cad_local;
create or replace view public.conf_filial         with (security_invoker = true) as select * from public.cad_filial;

notify pgrst, 'reload schema';
