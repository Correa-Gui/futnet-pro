

# Landing Page - FutVôlei Arena

## Resumo
Criar uma landing page pública de alta conversao em `/landing`, com copy persuasiva seguindo o framework solicitado. A pagina atual `/` redireciona por role -- a landing page sera uma rota separada, acessivel sem login.

## Estrutura da pagina

A landing page tera as 11 secoes do framework, adaptadas para FutVôlei Arena com foco em **agendar aula experimental** e tom **energetico e motivacional**:

1. **Hero (Acima da Dobra)** - Eyebrow + titulo impactante + marcadores de valor + CTA "Agende sua aula experimental" + removedor de atrito + prova social
2. **Secao de Leads** - USPs + ponto problematico + provocacao da solucao
3. **Prova Social** - Depoimentos de alunos + badges de confianca
4. **Beneficios** - Resultados que o aluno vai ter (saude, comunidade, habilidade)
5. **Diferenciadores** - Por que FutVôlei Arena vs treinar sozinho ou em outro lugar
6. **Como Funciona** - 3 passos simples ate a primeira aula
7. **Oferta** - Resumo da aula experimental + CTA
8. **Equipe** - Professores qualificados, humanizar a marca
9. **Prova Social com Arquetipos** - Perfis de alunos (iniciante, ex-atleta, fitness)
10. **FAQ** - Objecoes comuns respondidas
11. **Ponto Final** - Recapitulacao + CTA final

## Implementacao tecnica

### Arquivo novo: `src/pages/LandingPage.tsx`
- Componente unico com todas as 11 secoes
- Uso de `framer-motion` para animacoes de entrada (consistente com o resto do app)
- Design responsivo mobile-first
- Gradientes verde/amarelo alinhados com o design system existente
- CTAs linkando para `/cadastro` ou WhatsApp
- Navegacao suave entre secoes com scroll

### Rota nova no `src/App.tsx`
- Adicionar rota publica `/landing`
- Manter `/` como redirect por role (comportamento atual)

### Secoes de copy (adaptadas ao negocio)

**Hero:**
- Eyebrow: "A arena de futevôlei que transforma iniciantes em jogadores"
- Titulo: "Aprenda Futevôlei com Quem Entende. Sua Primeira Aula é Por Nossa Conta."
- Marcadores: Aulas para todos os niveis | Quadras profissionais | Horarios flexiveis
- CTA: "Agende Sua Aula Experimental Gratis"
- Removedor de atrito: "Sem compromisso. Sem mensalidade antecipada."

**Como Funciona:**
1. Escolha o melhor horario
2. Venha para sua aula experimental
3. Decida se quer continuar

**FAQ:** Preciso ter experiencia? / Quanto custa? / O que levar? / Posso cancelar?

## Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/pages/LandingPage.tsx` | **Novo** - Landing page completa com 11 secoes |
| `src/App.tsx` | Adicionar rota `/landing` |

Nenhuma alteracao de banco de dados necessaria.

