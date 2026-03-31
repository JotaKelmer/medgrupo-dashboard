# Handoff técnico

## 1. Visão de produto

O dashboard foi estruturado para responder três perguntas:

- **Geral** → o que aconteceu?
- **Verba** → o que tende a acontecer se eu investir X?
- **Controle** → a operação está saudável e os componentes de cálculo estão configurados?

## 2. Blocos implementados

### Geral
- Header com filtros
- KPIs
- Linha do tempo
- Funil customizável
- Demográficos
- Saúde dos criativos
- Alertas
- Tabela detalhada

### Verba
- orçamento total
- distribuição por canal
- benchmarks
- distribuição por objetivo
- estimativas
- planejado vs realizado

### Controle
- logs de sync
- régua de frequência
- métricas customizadas
- builder de funil

## 3. Decisões arquiteturais

### Workspace acima de contas de mídia
O projeto usa `workspaces` como entidade mãe.
Isso permite consolidar Meta + Google na mesma visão de negócio.

### daily_metrics como fonte principal
O dashboard todo parte de `daily_metrics`.
Outras tabelas existem para:
- materialização
- flexibilidade
- performance futura

### Funil desacoplado do schema fixo
Os passos do funil não estão hardcoded.
Isso foi feito para evitar engessamento e permitir qualquer jornada operacional.

### Criativos com interpretação
A frequência não é mostrada só como número.
Ela gera status, recomendação e leitura de desgaste.

## 4. Onde mexer primeiro no projeto

### Tema e branding
- `src/app/globals.css`

### Lógica de cálculo
- `src/lib/dashboard/calculations.ts`

### Querying e fallback mock / supabase
- `src/lib/dashboard/queries.ts`

### Builder de funil
- `src/components/dashboard/funnel-builder.tsx`

### Planejamento de verba
- `src/components/dashboard/budget-planner-panel.tsx`

### Schema e seed
- `supabase/schema.sql`
- `supabase/seed.sql`

## 5. Integração real sugerida

### Meta Ads
Criar job de ingestão:
- campanha
- conjunto
- anúncio
- spend
- impressions
- reach
- clicks
- lpv
- results
- vídeo
- breakdown demográfico

### Google Ads
Criar job com:
- campaign
- ad group
- asset group / ad
- impressions
- clicks
- conversions
- cost
- conversion value

### Estratégia sugerida
1. sync bruto
2. normalização
3. upsert em `daily_metrics`
4. snapshots/saúde em job separado

## 6. Escalabilidade

Quando o volume crescer:
- usar views materializadas
- mover health classification para background job
- indexar por `workspace_id + metric_date`
- particionar `daily_metrics` por mês se necessário

## 7. Segurança

Para a primeira entrega:
- RLS desligado

Para produção:
- habilitar auth
- criar tabela de membership por workspace
- policies em cascata por `workspace_id`
