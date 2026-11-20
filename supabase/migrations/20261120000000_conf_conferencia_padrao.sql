-- Padrão de conferência: cada conferência passa a ficar ligada ao padrão (tabela conf_modelo)
-- usado para criá-la, permitindo filtrar conferências por padrão.
-- Opcional: conferências antigas e conferências rápidas ficam sem padrão.
-- Apagar um padrão não apaga conferências: o vínculo só fica vazio.
alter table public.conf_conferencia
  add column if not exists padrao uuid references public.conf_modelo(id) on delete set null;

create index if not exists conf_conferencia_padrao_idx on public.conf_conferencia (padrao);

notify pgrst, 'reload schema';
