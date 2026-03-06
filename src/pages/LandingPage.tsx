import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Star, CheckCircle, Users, Clock, MapPin, Trophy,
  Zap, Heart, Target, Shield, ArrowRight, Phone,
  Flame, Sun, Dumbbell, Smile
} from 'lucide-react';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.08 } },
};

function SectionWrapper({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={stagger}
      className={`px-4 py-16 md:py-24 ${className}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </motion.section>
  );
}

function CTAButton({ text = 'Agende Sua Aula Experimental Grátis', large = false }: { text?: string; large?: boolean }) {
  return (
    <Link to="/cadastro">
      <Button size={large ? 'lg' : 'default'} className={`group font-bold ${large ? 'text-lg px-10 py-6' : 'px-8 py-5'} bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl transition-all`}>
        {text}
        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Button>
    </Link>
  );
}

/* ──────────────────────────────────────
   1. HERO — Acima da Dobra
   ────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-4 pb-20 pt-28 md:pb-28 md:pt-36">
      {/* decorative circles */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-secondary/10 blur-2xl" />

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Eyebrow */}
        <motion.div variants={fadeUp} custom={0}>
          <Badge className="mb-6 bg-secondary/20 text-primary-foreground border-secondary/30 text-sm px-4 py-1.5 backdrop-blur-sm">
            🏐 A arena que transforma iniciantes em jogadores
          </Badge>
        </motion.div>

        {/* Título */}
        <motion.h1 variants={fadeUp} custom={1} className="text-3xl font-extrabold leading-tight tracking-tight text-primary-foreground sm:text-4xl md:text-5xl lg:text-6xl">
          Aprenda Futevôlei com Quem Entende.{' '}
          <span className="text-secondary">Sua Primeira Aula é Por Nossa Conta.</span>
        </motion.h1>

        {/* Marcadores de valor */}
        <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-wrap items-center justify-center gap-4 text-primary-foreground/90">
          {[
            { icon: Target, text: 'Aulas para todos os níveis' },
            { icon: MapPin, text: 'Quadras profissionais' },
            { icon: Clock, text: 'Horários flexíveis' },
            { icon: Users, text: 'Turmas reduzidas' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm backdrop-blur-sm">
              <Icon className="h-4 w-4 text-secondary" />
              <span>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div variants={fadeUp} custom={3} className="mt-10">
          <CTAButton large />
        </motion.div>

        {/* Removedor de atrito */}
        <motion.p variants={fadeUp} custom={4} className="mt-4 text-sm text-primary-foreground/70">
          Sem compromisso · Sem mensalidade antecipada · Cancele quando quiser
        </motion.p>

        {/* Prova social */}
        <motion.div variants={fadeUp} custom={5} className="mt-8 flex flex-wrap items-center justify-center gap-6 text-primary-foreground/80">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
            ))}
            <span className="ml-2 text-sm font-medium">4.9 no Google</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-secondary" />
            <span>+500 alunos treinando</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-secondary" />
            <span>Professores certificados</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   2. SEÇÃO DE LEADS
   ────────────────────────────────────── */
function LeadsSection() {
  return (
    <SectionWrapper className="bg-background">
      <div className="grid gap-8 md:grid-cols-3">
        {[
          {
            icon: Trophy,
            title: '+500 alunos ativos',
            desc: 'Uma comunidade crescendo todos os dias com pessoas como você.',
          },
          {
            icon: Flame,
            title: 'Cansado de treinar sem evolução?',
            desc: 'Sem orientação profissional, é fácil se frustrar e desistir. Você merece um método que funciona.',
          },
          {
            icon: Zap,
            title: 'Evolua de verdade com a gente',
            desc: 'Nossos treinos são estruturados para você sentir progresso desde a primeira aula.',
          },
        ].map((item, i) => (
          <motion.div key={item.title} variants={fadeUp} custom={i}>
            <Card className="h-full border-border/50 bg-card hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   3. PROVA SOCIAL
   ────────────────────────────────────── */
function ProofSection() {
  const reviews = [
    { name: 'Lucas M.', text: 'Nunca tinha jogado futevôlei e em 2 meses já estava jogando com amigos. Os professores são incríveis!', rating: 5 },
    { name: 'Camila R.', text: 'A melhor decisão que tomei! Emagreci, fiz amigos e aprendi um esporte que amo. Super recomendo!', rating: 5 },
    { name: 'Rafael S.', text: 'Estrutura de primeira. Quadras profissionais, horários que cabem na minha rotina e aulas muito divertidas.', rating: 5 },
    { name: 'Ana P.', text: 'Meu filho de 14 anos adora! Além de exercício, ele desenvolveu disciplina e trabalho em equipe.', rating: 5 },
  ];

  return (
    <SectionWrapper className="bg-muted/30" id="depoimentos">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Depoimentos reais</Badge>
        <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">O Que Nossos Alunos Dizem</h2>
      </motion.div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {reviews.map((r, i) => (
          <motion.div key={r.name} variants={fadeUp} custom={i}>
            <Card className="h-full border-border/50">
              <CardContent className="p-6">
                <div className="mb-3 flex gap-0.5">
                  {[...Array(r.rating)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="mb-4 text-sm text-muted-foreground italic">"{r.text}"</p>
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   4. BENEFÍCIOS
   ────────────────────────────────────── */
function BenefitsSection() {
  const benefits = [
    { icon: Heart, title: 'Saúde e Condicionamento', desc: 'Queime até 600 calorias por aula enquanto se diverte na areia.' },
    { icon: Users, title: 'Comunidade Vibrante', desc: 'Faça amigos, participe de eventos e entre para um grupo motivado.' },
    { icon: Target, title: 'Evolução Técnica Real', desc: 'Método progressivo: do básico ao avançado, com feedback constante.' },
    { icon: Sun, title: 'Bem-Estar Mental', desc: 'Treinar ao ar livre reduz estresse e melhora o humor comprovadamente.' },
    { icon: Trophy, title: 'Competições Internas', desc: 'Participe de campeonatos entre alunos e teste suas habilidades.' },
    { icon: Dumbbell, title: 'Preparo Físico Completo', desc: 'Trabalhe pernas, core, agilidade e reflexo em cada sessão.' },
  ];

  return (
    <SectionWrapper className="bg-background" id="beneficios">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <Badge className="mb-4 bg-secondary/10 text-secondary-foreground border-secondary/20">Resultados reais</Badge>
        <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">O Que Você Ganha Treinando Com a Gente</h2>
      </motion.div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b, i) => (
          <motion.div key={b.title} variants={fadeUp} custom={i}>
            <div className="flex gap-4 rounded-xl border border-border/50 bg-card p-6 hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <b.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   5. DIFERENCIADORES
   ────────────────────────────────────── */
function DifferentiatorsSection() {
  const rows = [
    { feature: 'Aula experimental grátis', us: true, them: false },
    { feature: 'Professores certificados', us: true, them: false },
    { feature: 'Turmas por nível', us: true, them: false },
    { feature: 'Quadras profissionais', us: true, them: false },
    { feature: 'Horários flexíveis', us: true, them: false },
    { feature: 'Método progressivo', us: true, them: false },
    { feature: 'Comunidade ativa', us: true, them: false },
  ];

  return (
    <SectionWrapper className="bg-muted/30" id="diferenciais">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Compare e escolha</Badge>
        <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">Por Que a FutVôlei Arena?</h2>
      </motion.div>
      <motion.div variants={fadeUp} custom={1} className="mx-auto max-w-2xl">
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            <div className="grid grid-cols-3 border-b border-border bg-primary/5 px-6 py-4 text-sm font-bold text-foreground">
              <span>Característica</span>
              <span className="text-center text-primary">FutVôlei Arena</span>
              <span className="text-center text-muted-foreground">Outros</span>
            </div>
            {rows.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 items-center px-6 py-3 text-sm ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                <span className="text-foreground">{row.feature}</span>
                <span className="text-center">
                  <CheckCircle className="mx-auto h-5 w-5 text-primary" />
                </span>
                <span className="text-center text-muted-foreground">—</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   6. COMO FUNCIONA
   ────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    { num: '1', title: 'Escolha seu horário', desc: 'Veja os horários disponíveis e reserve o que melhor se encaixa na sua rotina.' },
    { num: '2', title: 'Venha para sua aula', desc: 'Chegue na quadra, conheça seu professor e aproveite sua primeira experiência.' },
    { num: '3', title: 'Decida se quer continuar', desc: 'Sem pressão. Se gostar, escolha o plano ideal para você. Simples assim.' },
  ];

  return (
    <SectionWrapper className="bg-background" id="como-funciona">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <Badge className="mb-4 bg-secondary/10 text-secondary-foreground border-secondary/20">Simples e rápido</Badge>
        <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">Três Passos Para Começar</h2>
      </motion.div>
      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div key={s.num} variants={fadeUp} custom={i} className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground shadow-lg">
              {s.num}
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} custom={3} className="mt-12 text-center">
        <CTAButton />
      </motion.div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   7. OFERTA
   ────────────────────────────────────── */
function OfferSection() {
  return (
    <SectionWrapper className="bg-gradient-to-br from-primary to-primary/80" id="oferta">
      <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center text-primary-foreground">
        <h2 className="text-3xl font-extrabold md:text-4xl">
          Sua Aula Experimental <span className="text-secondary">100% Gratuita</span>
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          {[
            'Aula com professor dedicado',
            'Equipamento incluso',
            'Turma para seu nível',
            'Sem cartão de crédito',
            'Sem compromisso futuro',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
              <CheckCircle className="h-4 w-4 text-secondary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <CTAButton large text="Quero Minha Aula Grátis" />
        </div>
        <p className="mt-4 text-sm text-primary-foreground/60">
          Vagas limitadas por turma · Garantia de satisfação
        </p>
      </motion.div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   8. EQUIPE
   ────────────────────────────────────── */
function TeamSection() {
  return (
    <SectionWrapper className="bg-background" id="equipe">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Quem te ensina</Badge>
        <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">Professores Que Vivem o Esporte</h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Nossa equipe é formada por atletas e treinadores certificados que competem em alto nível e dedicam suas carreiras a ensinar futevôlei com paixão e método.
        </p>
      </motion.div>
      <motion.div variants={fadeUp} custom={1} className="grid gap-6 sm:grid-cols-3">
        {[
          { name: 'Professor Dedicado', trait: 'Técnica individual', desc: 'Foco em fundamentos e evolução passo a passo.' },
          { name: 'Treino Estruturado', trait: 'Metodologia comprovada', desc: 'Planos de aula baseados em progressão real.' },
          { name: 'Suporte Contínuo', trait: 'Acompanhamento', desc: 'Feedback constante dentro e fora da quadra.' },
        ].map((t, i) => (
          <Card key={t.name} className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-foreground">{t.name}</h3>
              <Badge variant="secondary" className="my-2">{t.trait}</Badge>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   9. PROVA SOCIAL COM ARQUÉTIPOS
   ────────────────────────────────────── */
function ArchetypesSection() {
  const archetypes = [
    {
      icon: Smile,
      label: 'Iniciante Completo',
      quote: 'Nunca toquei numa bola de futevôlei e hoje jogo 3x por semana. Viciei!',
      name: 'Juliana, 28 anos',
    },
    {
      icon: Trophy,
      label: 'Ex-Atleta voltando à ativa',
      quote: 'Joguei vôlei na faculdade e encontrei no futevôlei a motivação que faltava.',
      name: 'Marcos, 35 anos',
    },
    {
      icon: Heart,
      label: 'Buscando saúde e bem-estar',
      quote: 'Perdi 8kg em 4 meses e ganhei um grupo de amigos incrível.',
      name: 'Fernanda, 42 anos',
    },
  ];

  return (
    <SectionWrapper className="bg-muted/30" id="perfis">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Para todos os perfis</Badge>
        <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">Quem Treina na FutVôlei Arena</h2>
      </motion.div>
      <div className="grid gap-6 md:grid-cols-3">
        {archetypes.map((a, i) => (
          <motion.div key={a.label} variants={fadeUp} custom={i}>
            <Card className="h-full border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <a.icon className="h-6 w-6 text-secondary" />
                </div>
                <Badge variant="outline" className="mb-3">{a.label}</Badge>
                <p className="mb-4 text-sm text-muted-foreground italic">"{a.quote}"</p>
                <p className="text-sm font-semibold text-foreground">— {a.name}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   10. FAQ
   ────────────────────────────────────── */
function FAQSection() {
  const faqs = [
    { q: 'Preciso ter experiência para começar?', a: 'Não! Temos turmas especiais para iniciantes. Nossos professores vão te guiar do zero, sem pressão.' },
    { q: 'Quanto custa a aula experimental?', a: 'A primeira aula é 100% gratuita e sem compromisso. Você só investe se decidir continuar.' },
    { q: 'O que preciso levar?', a: 'Apenas roupa confortável e vontade de se divertir. Nós fornecemos todo o equipamento necessário.' },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim! Nossos planos são flexíveis e sem fidelidade. Cancele quando quiser, sem burocracia.' },
    { q: 'Qual a duração de cada aula?', a: 'As aulas têm em média 1 hora, com aquecimento, treino técnico e jogo.' },
    { q: 'Vocês têm estacionamento?', a: 'Sim, temos estacionamento gratuito para alunos em todas as nossas unidades.' },
  ];

  return (
    <SectionWrapper className="bg-background" id="faq">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <Badge className="mb-4 bg-secondary/10 text-secondary-foreground border-secondary/20">Tire suas dúvidas</Badge>
        <h2 className="text-3xl font-extrabold text-foreground md:text-4xl">Perguntas Frequentes</h2>
      </motion.div>
      <motion.div variants={fadeUp} custom={1} className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-lg border border-border/50 bg-card px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   11. PONTO FINAL
   ────────────────────────────────────── */
function FinalCTASection() {
  return (
    <SectionWrapper className="bg-gradient-to-br from-primary to-primary/80">
      <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center text-primary-foreground">
        <h2 className="text-3xl font-extrabold md:text-4xl">
          Pronto Para Entrar na Quadra?
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          Sua jornada no futevôlei começa com uma decisão simples. Agende sua aula experimental gratuita e descubra o esporte que vai transformar sua rotina.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-primary-foreground/70">
          {['Aula grátis', 'Sem compromisso', 'Professores certificados', '+500 alunos'].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-secondary" />
              {item}
            </span>
          ))}
        </div>
        <div className="mt-10">
          <CTAButton large text="Agende Sua Aula Experimental Grátis" />
        </div>
        <p className="mt-4 text-sm text-primary-foreground/50">
          Vagas limitadas · Aprovação em minutos · Satisfação garantida
        </p>
      </motion.div>
    </SectionWrapper>
  );
}

/* ──────────────────────────────────────
   NAV (sticky simples)
   ────────────────────────────────────── */
function LandingNav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-primary-foreground/10 bg-primary/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/landing" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <span className="text-sm font-extrabold text-secondary-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>FV</span>
          </div>
          <span className="text-lg font-bold text-primary-foreground">FutVôlei Arena</span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {[
            { label: 'Benefícios', href: '#beneficios' },
            { label: 'Como Funciona', href: '#como-funciona' },
            { label: 'Depoimentos', href: '#depoimentos' },
            { label: 'FAQ', href: '#faq' },
          ].map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </div>
        <CTAButton text="Aula Grátis" />
      </div>
    </nav>
  );
}

/* ──────────────────────────────────────
   FOOTER
   ────────────────────────────────────── */
function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} FutVôlei Arena. Todos os direitos reservados.</p>
        <div className="flex gap-4">
          <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Phone className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────
   LANDING PAGE
   ────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <LeadsSection />
      <ProofSection />
      <BenefitsSection />
      <DifferentiatorsSection />
      <HowItWorksSection />
      <OfferSection />
      <TeamSection />
      <ArchetypesSection />
      <FAQSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
}
