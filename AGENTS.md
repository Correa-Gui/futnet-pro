# AGENTS.md

## Objetivo do projeto
Painel FutPro em React/Vite/TypeScript com integrações Supabase para administração do sistema, configurações e recursos do chatbot.

## Escopo deste repositório
Trabalhar apenas no painel/admin e nos artefatos Supabase deste projeto.
Este repositório cobre:
- páginas e componentes do painel
- configurações administrativas
- leitura/gravação em `system_config`
- catálogo de intents
- edge functions
- migrations
- integrações front com Supabase

## Fora de escopo
- não mexer no backend FastAPI do chatbot
- não alterar código de outro repositório
- não criar soluções que dependam de mudanças obrigatórias no backend sem explicitar isso
- não reintroduzir camada institucional no chatbot

## Direção do produto
O painel deve suportar o chatbot operacional.
Priorizar:
- configurações reais do sistema
- catálogo de intents operacionais
- consistência entre UI, Supabase e contrato consumido pelo backend
- simplicidade de manutenção

Evitar:
- campos órfãos
- config não utilizada
- endpoints ou funções legadas expostas sem necessidade
- acoplamento desnecessário com fluxos institucionais

## Fonte de verdade
Priorizar:
1. `system_config`
2. tabelas operacionais do domínio
3. catálogo de intents
4. edge functions estritamente necessárias

## Regras obrigatórias
- priorizar diff mínimo
- manter compatibilidade com o backend atual sempre que possível
- não criar refatoração ampla sem necessidade
- não alterar UI além do necessário para a tarefa
- não manter campos/configurações sem uso real
- remover vestígios de `institutional` / `institucional` quando fizer sentido no escopo da tarefa
- não adicionar dependências novas sem necessidade clara

## Áreas principais
- `src/pages/`
- `src/components/`
- `src/hooks/`
- `src/integrations/`
- `src/data/`
- `supabase/functions/`
- `supabase/migrations/`

## Pontos sensíveis
Alterar com cuidado:
- `system_config`
- `chatbot_intent_categories`
- `chatbot_intent_examples`
- edge functions usadas pelo chatbot
- migrations já aplicadas
- contratos retornados para consumo externo

## Sobre o chatbot neste projeto
Este projeto deve sustentar o chatbot operacional.
Manter foco em:
- horários
- preços
- day use
- nome/configuração da arena
- intents operacionais
- configurações realmente utilizadas

Evitar manter:
- `chatbot_openai_institutional_prompt_id`
- `chatbot_openai_vector_store_id`
- endpoints/functions institucionais sem uso
- categoria `institutional` no catálogo, quando a tarefa for limpeza operacional

## Sobre migrations
- não reescrever migrations antigas sem necessidade
- preferir novas correções pontuais quando for o caso
- se uma migration antiga ficar legada, sinalizar em vez de inventar risco desnecessário
- preservar histórico quando isso for mais seguro que editar migração já consolidada

## Sobre UI
- não fazer mudanças cosméticas desnecessárias
- remover apenas o que estiver fora de uso ou fora da direção atual
- manter a interface consistente com o que o backend realmente consome

## Como trabalhar
Ao receber uma tarefa:
1. identificar a menor superfície de alteração
2. ajustar UI, function e config somente se necessário
3. preservar contrato atual ou explicitar quebra
4. validar se a configuração continua coerente de ponta a ponta
5. informar objetivamente os arquivos alterados

## Validação mínima obrigatória
Após mudanças relevantes, considerar impacto em:
- tela administrativa afetada
- leitura/escrita em `system_config`
- catálogo de intents
- edge functions alteradas
- payload retornado ao backend
- consistência entre front, Supabase e operação real

## Formato esperado de entrega
Responder de forma objetiva:
1. arquivos alterados
2. o que mudou em cada arquivo
3. se existe resquício legado ou dependência externa pendente

## Estilo de mudança
- diff mínimo
- sem comentários desnecessários
- sem refactor amplo não solicitado
- sem alterações paralelas fora da tarefa