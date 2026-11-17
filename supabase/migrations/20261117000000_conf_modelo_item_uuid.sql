-- O app gera ids uuid no cliente (offline-first); o id bigint impedia criar itens de modelo pelo app.
alter table public.conf_modelo_item add column id_uuid uuid not null default gen_random_uuid();
alter table public.conf_modelo_item drop constraint conf_modelo_item_pkey;
alter table public.conf_modelo_item drop column id;
alter table public.conf_modelo_item rename column id_uuid to id;
alter table public.conf_modelo_item add constraint conf_modelo_item_pkey primary key (id);

-- o mesmo item não entra duas vezes no mesmo modelo
alter table public.conf_modelo_item add constraint conf_modelo_item_modelo_item_key unique (modelo, item);

notify pgrst, 'reload schema';
