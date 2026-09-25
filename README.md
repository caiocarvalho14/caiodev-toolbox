# Toolbox — Plataforma interna de gestão operacional (ainda em desenvolvimento)

Plataforma web (PWA) desenvolvida para centralizar ferramentas internas de operação, substituindo processos manuais por soluções digitais rastreáveis.

---

## O problema

O controle de estoque era feito através de **conferência diária manual, em papel e caneta**:

- Cada item era contado fisicamente e anotado à mão, por local (câmara fria, área de vendas, etc.)
- Os valores eram depois transcritos para planilhas, gerando **atraso entre a coleta e a análise**
- Anotações em papel eram facilmente **perdidas, rasuradas ou ilegíveis**
- **Não existia histórico estruturado** — comparar a divergência de um item ao longo de várias conferências exigia garimpar planilhas antigas, quando elas ainda existiam
- O cálculo de divergência (físico vs. sistema) era feito manualmente, item por item, sujeito a erro de conta

O resultado prático: decisões sobre bloqueio de valor por avaria e investigação de perdas recorrentes dependiam de dados que já chegavam atrasados, incompletos ou impossíveis de cruzar.

---

## A solução

Construí o **Toolbox**: uma plataforma web com arquitetura modular, pensada para hospedar múltiplas ferramentas internas ao longo do tempo — controle de acesso por rota e por cargo, painel administrativo, e um sistema de módulos independentes.

O primeiro módulo, **Conferência**, resolve o problema descrito acima:

- **Contagem digital por local**, com cálculo automático de tara por marca (desconto de peso de embalagem, considerando múltiplas caixas)
- **Divergência calculada automaticamente**, em tempo real, sem depender de planilha externa
- **Modelos de conferência**: itens recorrentes podem ser aplicados de uma vez a uma nova conferência, eliminando recadastro manual
- **Relatórios exportáveis em PDF**, com múltiplas conferências empiladas por data para comparação
- **Histórico completo e estruturado** de todas as conferências, consultável e filtrável a qualquer momento
- Os dados coletados alimentam **dashboards no Power BI**, permitindo identificar itens com divergência recorrente e apoiar decisões operacionais

---

## Stack técnica e decisões de arquitetura

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" /> <img src="https://img.shields.io/badge/TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=white" /> <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" /> |  Tipagem estática para reduzir erros em regras de negócio (cálculo de tara, divergência); build rápido |
| **Estilo** | <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" /> | Estilização baseada em utilitários, permitindo criar uma interface responsiva e consistente |
| **Backend / Banco** | <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" /> <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" /> | Banco relacional real, Row Level Security nativo e API REST automática |
| **Autenticação e permissões** | <img src="https://img.shields.io/badge/Supabase_Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" /> |  Controle de acesso por rota e por cargo, aplicado no nível do banco — não só na interface |
| **Armazenamento local** | <img src="https://img.shields.io/badge/IndexedDB-000000?style=for-the-badge&logo=googlechrome&logoColor=white" /> <img src="https://img.shields.io/badge/Dexie.js-FF6F00?style=for-the-badge&logo=javascript&logoColor=white" /> | Persistência local para permitir funcionamento offline e carregamento rápido dos dados já sincronizados |
| **Geração de PDF** | <img src="https://img.shields.io/badge/jsPDF-F40F02?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" />  | Geração de relatórios e tabelas em PDF diretamente no navegador, sem backend dedicado |
| **Análise de dados** | <img src="https://img.shields.io/badge/Power_BI-F2C811?style=for-the-badge&logo=powerbi&logoColor=black" /> | Camada de BI conectada aos dados operacionais coletados pelo módulo |

### Por que offline-first

A operação acontece no chão de fábrica, onde a conexão de internet não é garantida — câmaras frias e áreas de estoque nem sempre têm sinal estável. Um sistema que dependesse de conexão contínua **pararia a operação**, que é exatamente o problema que o papel resolvia (por pior que fosse).

A solução foi desenhar a aplicação como **offline-first de verdade**, não como um PWA com cache superficial:

1. **Toda escrita é local primeiro.** Ao registrar uma contagem, o dado é salvo imediatamente no IndexedDB do dispositivo — a interface nunca espera resposta de rede para considerar a ação concluída.
2. **Fila de sincronização (padrão outbox).** Cada escrita local gera uma entrada numa fila de pendências. Enquanto não há conexão, os itens acumulam sem bloquear o uso do app.
3. **Sincronização sob controle do usuário.** Um botão dedicado envia as pendências para o Supabase quando há conexão disponível, com feedback visual de quantos itens aguardam envio.
4. **Detecção de conexão real**, não apenas o evento do navegador — o app testa se o servidor está de fato alcançável antes de tentar sincronizar, evitando falhas silenciosas em redes instáveis.
5. **Tratamento de conflito e erro**, com retry automático e mensagens de erro quando uma sincronização falha.

Esse desenho garante que a pessoa fazendo a conferência físico nunca é interrompida por falta de internet — o mesmo problema que o papel "resolvia", mas agora sem perder rastreabilidade, histórico ou precisão de cálculo.

---

## Resultado

- Eliminação do papel no processo de conferência diária
- Divergência calculada automaticamente, sem erro de conta manual
- Histórico completo e consultável, permitindo identificar padrões de perda ao longo do tempo
- Dados estruturados alimentando análises em Power BI, algo impossível no processo anterior
- Sistema funcional mesmo em áreas sem conexão de internet confiável

![Página de registros de cada conferência](./public/screenshot2.png)
![Página de emissão de relatórios](./public/screenshot3.png)

---

## Relatório Power BI - Em desenvolvimento.

![Relatório Power BI - Em desenvolvimento](./public/powerbirelatory.png)

---

## Autor

Desenvolvido por Caio Carvalho — stack principal em React/TypeScript/Supabase.
