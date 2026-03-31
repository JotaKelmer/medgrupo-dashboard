# Dashboard MEDGRUPO

Projeto em **Next.js App Router + Supabase + Tailwind** para operação de mídia paga com três frentes:

- **Geral**: KPIs, linha do tempo, funil customizável, demográficos, saúde dos criativos, alertas e tabela detalhada
- **Verba**: orçamento, distribuição por canal, benchmarks, planejamento por objetivo, estimativas e planejado vs realizado
- **Controle**: status de sync, régua de frequência, métricas customizadas e builder de funil

## Stack

- Next.js App Router
- React
- Supabase
- Tailwind CSS
- Recharts

## O que já vem pronto

- Tema escuro MEDGRUPO com paleta:
  - `#121616`
  - `#D9EB1A`
  - `#489696`
  - `#8E1AEB`
- Estrutura funcional das páginas `/dashboard/geral`, `/dashboard/verba` e `/dashboard/controle`
- Schema SQL completo com:
  - `workspaces`
  - `ad_accounts`
  - `campaigns`
  - `ad_sets`
  - `ads`
  - `daily_metrics`
  - `demographic_metrics`
  - `budget_*`
  - `channel_benchmarks`
  - `funnels`
  - `funnel_steps`
  - `custom_metric_*`
  - `creative_frequency_rules`
  - `creative_health_snapshots`
  - `sync_runs`
- Seed de exemplo para a conta MEDGRUPO
- Modo mock para rodar antes da conexão real com o Supabase
- APIs de persistência para:
  - plano de verba
  - régua de frequência
  - métricas customizadas
  - funis

---

## Como rodar

### 1) Instalar dependências

```bash
pnpm install
```

ou

```bash
npm install
```

### 2) Configurar ambiente

Copie o arquivo `.env.example` para `.env.local`.

```bash
cp .env.example .env.local
```

### 3) Rodar em modo mock

Se quiser validar a interface antes do banco, mantenha:

```env
NEXT_PUBLIC_ENABLE_MOCKS=true
```

### 4) Rodar com Supabase

No `.env.local`:

```env
NEXT_PUBLIC_ENABLE_MOCKS=false
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 5) Criar o banco

No SQL Editor do Supabase:

1. execute `supabase/schema.sql`
2. execute `supabase/seed.sql`

### 6) Subir o projeto

```bash
pnpm dev
```

ou

```bash
npm run dev
```

---

## Rotas

- `/dashboard/geral`
- `/dashboard/verba`
- `/dashboard/controle`
- `/api/health`

### APIs internas

- `POST /api/budget-plans`
- `POST /api/creative-rules`
- `POST /api/custom-metrics`
- `POST /api/funnels`

---

## Decisão estrutural importante

Eu normalizei o conceito de **Conta** em dois níveis:

### 1. `workspaces`
Representa a conta lógica do dashboard / cliente / operação.

### 2. `ad_accounts`
Representa as conexões reais por plataforma:
- Meta Ads
- Google Ads

Isso resolve um problema comum do schema inicial: o planejamento e a leitura consolidada não ficam presos a uma única conta de plataforma.

---

## Funil realmente customizável

O funil não depende mais de colunas rígidas.

Cada funil tem:

- cadastro em `funnels`
- etapas em `funnel_steps`
- origem da métrica:
  - `standard`
  - `custom`

### Exemplos suportados

- Funil de Vendas
- Retenção de Vídeo
- WhatsApp Comercial
- qualquer outro fluxo customizado

O usuário consegue criar e editar funis em `/dashboard/controle`.

---

## Saúde dos criativos

O bloco de criativos já foi pensado como leitura de negócio, não só métrica solta.

A classificação usa:

- frequência
- tendência de CTR
- tendência de custo por resultado
- régua configurável por conta

Status:

- `good`
- `warning`
- `replace`
- `critical`

---

## Estrutura de pastas

```txt
src/
  app/
    (dashboard)/
      dashboard/
        geral/
        verba/
        controle/
    api/
      budget-plans/
      creative-rules/
      custom-metrics/
      funnels/
      health/

  components/
    dashboard/
    ui/

  lib/
    dashboard/
    supabase/

supabase/
  schema.sql
  seed.sql
```

---

## Próximos passos recomendados

### 1. Ligar autenticação
Hoje o projeto está preparado para Supabase, mas sem login obrigatório.

### 2. Ligar RLS
O schema foi deixado sem policies para acelerar a implementação inicial.

### 3. Substituir mocks por sync real
Conectar:

- Meta Marketing API
- Google Ads API

### 4. Materializar agregações pesadas
Se o volume crescer, mover parte dos cálculos para:
- views
- materialized views
- edge functions
- jobs de consolidação

---

## Observação prática

Este projeto foi pensado como **base implementável de produção**, não só como wireframe.

Você já consegue:

- subir a interface
- conectar ao Supabase
- popular dados
- editar verba
- criar funis
- cadastrar métricas customizadas
- ajustar régua de frequência
- evoluir as integrações
