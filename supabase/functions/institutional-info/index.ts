import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
} from "../_shared/booking.ts";

const CATEGORY_ALIASES: Record<string, string> = {
  reserva: "reservas",
  reservas: "reservas",
  cancelamento: "cancelamento",
  cancelamentos: "cancelamento",
  pagamento: "pagamentos",
  pagamentos: "pagamentos",
  horario: "horarios",
  horarios: "horarios",
  localizacao: "localizacao",
  localização: "localizacao",
  faq: "faq",
  valores: "valores",
  valor: "valores",
  regras: "regras",
  regra: "regras",
  aulas: "aulas",
  aula: "aulas",
  professores: "professores",
  professor: "professores",
  planos: "planos",
  plano: "planos",
  contato: "contato",
  contatos: "contato",
};

function normalizeCategory(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return CATEGORY_ALIASES[normalized] || normalized;
}

function inferCategoryFromQuestion(question: string | null) {
  if (!question) return null;
  const normalized = question.trim().toLowerCase();
  const rules: Array<[string, string[]]> = [
    ["cancelamento", ["cancel", "remarca", "desmarcar"]],
    ["pagamentos", ["pix", "cart", "dinheiro", "pagamento", "pagar"]],
    ["horarios", ["horario", "funcionamento", "abre", "fecha"]],
    ["localizacao", ["onde fica", "endereco", "localizacao", "localização", "como chegar"]],
    ["faq", ["duvida", "dúvida", "faq", "pergunta frequente"]],
    ["valores", ["valor", "preco", "preço", "quanto custa"]],
    ["regras", ["regra", "regulamento", "norma"]],
    ["aulas", ["aula", "turma", "modalidade"]],
    ["professores", ["professor", "coach", "instrutor"]],
    ["planos", ["plano", "mensalidade", "pacote"]],
    ["contato", ["contato", "telefone", "whatsapp", "falar com", "atendimento"]],
    ["reservas", ["reserva", "agendamento", "day use"]],
  ];

  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }
  return null;
}

async function loadTeachers(supabase: any) {
  const { data: teachers, error } = await supabase
    .from("teacher_profiles")
    .select("id, user_id, rate_per_class, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const teacherRows = teachers || [];
  const userIds = teacherRows.map((teacher: any) => teacher.user_id).filter(Boolean);
  if (!userIds.length) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  if (profileError) {
    throw profileError;
  }

  const profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile.full_name]));
  return teacherRows.map((teacher: any) => ({
    id: teacher.id,
    name: profileMap.get(teacher.user_id) || "Professor",
    rate_per_class: teacher.rate_per_class ?? null,
    updated_at: teacher.updated_at,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Metodo nao permitido", 405);
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);
    const explicitCategory = normalizeCategory(url.searchParams.get("category"));
    const slug = url.searchParams.get("slug")?.trim() || null;
    const question = url.searchParams.get("question")?.trim() || null;
    const category = explicitCategory || inferCategoryFromQuestion(question);

    if (category === "professores") {
      const teachers = await loadTeachers(supabase);
      if (teachers.length) {
        return jsonResponse({
          found: true,
          category: "professores",
          slug,
          title: "Professores",
          content: {
            summary: "Estes sao os professores cadastrados no sistema no momento.",
            teachers,
            rules: [
              "A lista pode mudar conforme o cadastro da equipe.",
              "Consulte a equipe para detalhes sobre aulas e turmas.",
            ],
          },
          updated_at: teachers[0]?.updated_at,
          item: null,
          items: teachers,
          question,
        });
      }
    }

    let query = supabase
      .from("institutional_info")
      .select("id, category, slug, title, content, updated_at")
      .eq("is_active", true);

    if (slug) {
      query = query.eq("slug", slug);
    } else if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("updated_at", { ascending: false }).limit(10);
    if (error) {
      throw error;
    }

    const items = data || [];
    if (!items.length) {
      return jsonResponse({
        found: false,
        category,
        slug,
        question,
        item: null,
        items: [],
      }, 200);
    }

    const primary = items[0];
    return jsonResponse({
      found: true,
      category: primary.category,
      slug: primary.slug,
      title: primary.title,
      content: primary.content,
      updated_at: primary.updated_at,
      item: primary,
      items,
      question,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
