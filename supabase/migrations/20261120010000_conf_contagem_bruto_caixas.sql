-- Pesagem com detalhe: além do líquido (contagem), guarda o peso bruto da balança, a quantidade
-- de caixas e a tara de uma caixa usada no momento da pesagem.
--   contagem (líquido) = peso_bruto - qtd_caixas * tara_caixa
-- `contagem` continua sendo o valor usado em relatórios, dashboard e divergência.
-- Campos opcionais: pesagens antigas, itens contados por unidade e aparelhos com versão antiga
-- do app ficam sem detalhe.
alter table public.conf_contagem
  add column if not exists peso_bruto real,
  add column if not exists qtd_caixas integer,
  add column if not exists tara_caixa real;

alter table public.conf_contagem drop constraint if exists conf_contagem_qtd_caixas_check;
alter table public.conf_contagem
  add constraint conf_contagem_qtd_caixas_check check (qtd_caixas is null or qtd_caixas >= 0);

alter table public.conf_contagem drop constraint if exists conf_contagem_tara_caixa_check;
alter table public.conf_contagem
  add constraint conf_contagem_tara_caixa_check check (tara_caixa is null or tara_caixa >= 0);

notify pgrst, 'reload schema';
