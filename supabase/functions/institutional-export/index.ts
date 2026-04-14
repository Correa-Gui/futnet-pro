import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
  normalizeBusinessHours,
} from "../_shared/booking.ts";

const CONFIG_KEYS = [
  "company_name",
  "company_logo_url",
  "app_url",
  "court_rental_price",
  "day_use_price",
  "reservation_deposit_percentage",
  "business_hours",
] as const;

function parseMoneyLike(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  let cleaned = value.trim();
  if (!cleaned) {
    return fallback;
  }

  cleaned = cleaned.replace(/R\$/gi, "").replace(/\s+/g, "");

  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function stringifyContent(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyContent(item))
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const rendered = stringifyContent(item);
        if (!rendered) return "";
        if (rendered.includes("\n")) {
          return `${key}:\n${rendered}`;
        }
        return `${key}: ${rendered}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  return String(value).trim();
}

function normalizeCategoryTitle(category: string) {
  const map: Record<string, string> = {
    professores: "Professores",
    aulas: "Aulas",
    planos: "Planos",
    pagamentos: "Pagamentos",
    regras: "Regras",
    localizacao: "Localização",
    contato: "Contato",
    faq: "FAQ",
    valores: "Valores",
    reservas: "Reservas",
    cancelamento: "Cancelamento",
  };

  return map[category] || category;
}

function safeParseBusinessHours(value: unknown) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildBlockDocument({
  block,
  title,
  text,
  source,
  updatedAt,
  meta = {},
}: {
  block: string;
  title: string;
  text: string;
  source: string;
  updatedAt: string | null;
  meta?: Record<string, unknown>;
}) {
  return {
    block,
    title,
    text: text.trim(),
    source,
    updated_at: updatedAt,
    meta,
  };
}

async function loadTeachers(supabase: any) {
  const { data: teachers, error } = await supabase
    .from("teacher_profiles")
    .select("id, user_id, rate_per_class, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const teacherRows = teachers || [];
  const userIds = teacherRows.map((teacher: any) => teacher.user_id).filter(Boolean);

  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, status")
        .in("user_id", userIds)
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
  return teacherRows.map((teacher: any) => ({
    id: teacher.id,
    name: profileMap.get(teacher.user_id)?.full_name || "Professor",
    email: profileMap.get(teacher.user_id)?.email || null,
    phone: profileMap.get(teacher.user_id)?.phone || null,
    status: profileMap.get(teacher.user_id)?.status || null,
    rate_per_class: teacher.rate_per_class ?? null,
    created_at: teacher.created_at,
    updated_at: teacher.updated_at,
  }));
}

async function loadClasses(supabase: any) {
  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, name, day_of_week, start_time, end_time, status, level, court_id, teacher_id, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const classRows = classes || [];
  const courtIds = [...new Set(classRows.map((item: any) => item.court_id).filter(Boolean))];
  const teacherIds = [...new Set(classRows.map((item: any) => item.teacher_id).filter(Boolean))];

  const [{ data: courts }, { data: teachers }] = await Promise.all([
    courtIds.length
      ? supabase.from("courts").select("id, name, location").in("id", courtIds)
      : Promise.resolve({ data: [] }),
    teacherIds.length
      ? supabase.from("teacher_profiles").select("id, user_id").in("id", teacherIds)
      : Promise.resolve({ data: [] }),
  ]);

  const teacherUserIds = [...new Set((teachers || []).map((teacher: any) => teacher.user_id).filter(Boolean))];
  const { data: profiles } = teacherUserIds.length
    ? await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherUserIds)
    : { data: [] };

  const courtMap = new Map((courts || []).map((court: any) => [court.id, court]));
  const teacherMap = new Map((teachers || []).map((teacher: any) => [teacher.id, teacher.user_id]));
  const profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile.full_name]));

  return classRows.map((item: any) => ({
    id: item.id,
    name: item.name,
    days: item.day_of_week,
    start_time: item.start_time,
    end_time: item.end_time,
    level: item.level,
    status: item.status,
    court: courtMap.get(item.court_id) || null,
    teacher_name: profileMap.get(teacherMap.get(item.teacher_id)) || null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
}

async function loadPlans(supabase: any) {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, description, classes_per_week, monthly_price, is_active, created_at, updated_at")
    .order("monthly_price", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadInstitutionalRows(supabase: any) {
  const { data, error } = await supabase
    .from("institutional_info")
    .select("id, category, slug, title, content, updated_at, is_active")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadSystemConfig(supabase: any) {
  const { data, error } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", CONFIG_KEYS);

  if (error) throw error;

  const configMap = Object.fromEntries((data || []).map((row: any) => [row.key, row.value]));
  const businessHours = normalizeBusinessHours(safeParseBusinessHours(configMap.business_hours));

  return {
    company_name: String(configMap.company_name || "Arena").trim() || "Arena",
    company_logo_url: String(configMap.company_logo_url || "").trim() || null,
    app_url: String(configMap.app_url || "").trim() || null,
    pricing: {
      court_rental_price: parseMoneyLike(configMap.court_rental_price),
      day_use_price: parseMoneyLike(configMap.day_use_price),
    },
    reservation_deposit_percentage: parseMoneyLike(configMap.reservation_deposit_percentage),
    business_hours: businessHours,
  };
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
    const [systemConfig, teachers, classes, plans, institutionalRows] = await Promise.all([
      loadSystemConfig(supabase),
      loadTeachers(supabase),
      loadClasses(supabase),
      loadPlans(supabase),
      loadInstitutionalRows(supabase),
    ]);

    const rowsByCategory = new Map<string, any[]>();
    for (const row of institutionalRows) {
      const bucket = rowsByCategory.get(row.category) || [];
      bucket.push(row);
      rowsByCategory.set(row.category, bucket);
    }

    const teacherDocuments = teachers.map((teacher: any) =>
      buildBlockDocument({
        block: "professores",
        title: teacher.name,
        text: [
          `Professor: ${teacher.name}`,
          teacher.email ? `E-mail: ${teacher.email}` : null,
          teacher.phone ? `Telefone: ${teacher.phone}` : null,
          teacher.rate_per_class != null ? `Valor por aula: R$ ${Number(teacher.rate_per_class).toFixed(2)}` : null,
          teacher.status ? `Status: ${teacher.status}` : null,
        ].filter(Boolean).join("\n"),
        source: "teacher_profiles/profiles",
        updatedAt: teacher.updated_at,
        meta: teacher,
      }),
    );

    const classDocuments = classes.map((item: any) =>
      buildBlockDocument({
        block: "aulas",
        title: item.name,
        text: [
          `Aula: ${item.name}`,
          item.level ? `Nivel: ${item.level}` : null,
          item.teacher_name ? `Professor: ${item.teacher_name}` : null,
          item.court?.name ? `Quadra: ${item.court.name}` : null,
          item.court?.location ? `Localizacao: ${item.court.location}` : null,
          Array.isArray(item.days) ? `Dias da semana: ${item.days.join(", ")}` : null,
          item.start_time && item.end_time ? `Horario: ${item.start_time} às ${item.end_time}` : null,
          item.status ? `Status: ${item.status}` : null,
        ].filter(Boolean).join("\n"),
        source: "classes",
        updatedAt: item.updated_at,
        meta: item,
      }),
    );

    const planDocuments = plans.map((plan: any) =>
      buildBlockDocument({
        block: "planos",
        title: plan.name,
        text: [
          `Plano: ${plan.name}`,
          plan.description ? `Descricao: ${plan.description}` : null,
          `Aulas por semana: ${plan.classes_per_week}`,
          `Valor mensal: R$ ${Number(plan.monthly_price || 0).toFixed(2)}`,
          `Status: ${plan.is_active ? "ativo" : "inativo"}`,
        ].filter(Boolean).join("\n"),
        source: "plans",
        updatedAt: plan.updated_at,
        meta: plan,
      }),
    );

    const groupedInstitutionalDocuments = Object.fromEntries(
      [
        "pagamentos",
        "regras",
        "localizacao",
        "contato",
        "faq",
        "valores",
        "reservas",
        "cancelamento",
      ].map((category) => {
        const items = rowsByCategory.get(category) || [];
        return [
          category,
          items.map((item: any) =>
            buildBlockDocument({
              block: category,
              title: item.title || normalizeCategoryTitle(category),
              text: [
                `${normalizeCategoryTitle(category)}: ${item.title || item.slug || ""}`.trim(),
                stringifyContent(item.content),
              ].filter(Boolean).join("\n"),
              source: "institutional_info",
              updatedAt: item.updated_at,
              meta: {
                id: item.id,
                slug: item.slug,
                category: item.category,
              },
            }),
          ),
        ];
      }),
    );

    const reservationSettingsDocument = buildBlockDocument({
      block: "reservas",
      title: "Configuracoes operacionais de reservas",
      text: [
        `Nome da empresa: ${systemConfig.company_name}`,
        `Horario de funcionamento: ${systemConfig.business_hours.start} às ${systemConfig.business_hours.end}`,
        `Dias abertos: ${systemConfig.business_hours.open_days.join(", ")}`,
        `Percentual de deposito: ${systemConfig.reservation_deposit_percentage}%`,
      ].join("\n"),
      source: "system_config",
      updatedAt: null,
      meta: systemConfig,
    });

    const valueSettingsDocument = buildBlockDocument({
      block: "valores",
      title: "Valores oficiais",
      text: [
        `Nome da empresa: ${systemConfig.company_name}`,
        `Valor por hora: R$ ${systemConfig.pricing.court_rental_price.toFixed(2)}`,
        `Valor day use: R$ ${systemConfig.pricing.day_use_price.toFixed(2)}`,
      ].join("\n"),
      source: "system_config",
      updatedAt: null,
      meta: systemConfig,
    });

    const localizedBlocks = {
      professores: teacherDocuments,
      aulas: classDocuments,
      planos: planDocuments,
      pagamentos: groupedInstitutionalDocuments.pagamentos || [],
      regras: groupedInstitutionalDocuments.regras || [],
      localizacao: groupedInstitutionalDocuments.localizacao || [],
      contato: [...(groupedInstitutionalDocuments.contato || []), buildBlockDocument({
        block: "contato",
        title: "Contato institucional",
        text: [
          `Empresa: ${systemConfig.company_name}`,
          systemConfig.app_url ? `App/Website: ${systemConfig.app_url}` : null,
        ].filter(Boolean).join("\n"),
        source: "system_config",
        updatedAt: null,
        meta: { company_name: systemConfig.company_name, app_url: systemConfig.app_url },
      })],
      faq: groupedInstitutionalDocuments.faq || [],
      valores: [...(groupedInstitutionalDocuments.valores || []), valueSettingsDocument],
      reservas: [...(groupedInstitutionalDocuments.reservas || []), reservationSettingsDocument],
      cancelamento: groupedInstitutionalDocuments.cancelamento || [],
    };

    const documents = Object.entries(localizedBlocks).flatMap(([block, items]) =>
      (items || []).map((item: any) => ({
        ...item,
        block,
      })),
    );

    return jsonResponse({
      generated_at: new Date().toISOString(),
      company_name: systemConfig.company_name,
      operational_config: systemConfig,
      blocks: localizedBlocks,
      documents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
