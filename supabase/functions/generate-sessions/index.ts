import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Optionally accept a date range, default: next 7 days
    const body = await req.json().catch(() => ({}));
    const daysAhead = body.days_ahead || 7;

    // Get all active classes
    const { data: classes, error: classErr } = await adminClient
      .from("classes")
      .select("id, day_of_week")
      .eq("status", "active");

    if (classErr) throw classErr;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionsToInsert: { class_id: string; date: string }[] = [];

    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dow = d.getDay(); // 0=Sun, 1=Mon...
      const dateStr = d.toISOString().split("T")[0];

      for (const cls of classes || []) {
        if (cls.day_of_week.includes(dow)) {
          sessionsToInsert.push({ class_id: cls.id, date: dateStr });
        }
      }
    }

    if (sessionsToInsert.length === 0) {
      return new Response(JSON.stringify({ created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert to avoid duplicates - check existing first
    const dates = [...new Set(sessionsToInsert.map(s => s.date))];
    const classIds = [...new Set(sessionsToInsert.map(s => s.class_id))];

    const { data: existing } = await adminClient
      .from("class_sessions")
      .select("class_id, date")
      .in("class_id", classIds)
      .in("date", dates);

    const existingSet = new Set(
      (existing || []).map(e => `${e.class_id}_${e.date}`)
    );

    const newSessions = sessionsToInsert.filter(
      s => !existingSet.has(`${s.class_id}_${s.date}`)
    );

    if (newSessions.length > 0) {
      const { error: insertErr } = await adminClient
        .from("class_sessions")
        .insert(newSessions);
      if (insertErr) throw insertErr;
    }

    // Auto-create attendance records for enrolled students (for ALL sessions in range, not just new ones)
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("class_id, student_id")
      .eq("status", "active")
      .in("class_id", classIds);

    if (enrollments && enrollments.length > 0) {
      // Get all sessions in the date range for these classes
      const { data: allSessions } = await adminClient
        .from("class_sessions")
        .select("id, class_id, date")
        .in("class_id", classIds)
        .in("date", dates);

      const attendanceRecords: { session_id: string; student_id: string }[] = [];
      for (const session of allSessions || []) {
        const classEnrollments = enrollments.filter(e => e.class_id === session.class_id);
        for (const enrollment of classEnrollments) {
          attendanceRecords.push({
            session_id: session.id,
            student_id: enrollment.student_id,
          });
        }
      }

      if (attendanceRecords.length > 0) {
        // Check existing attendance records
        const sessionIds = [...new Set(attendanceRecords.map(a => a.session_id))];
        const { data: existingAtt } = await adminClient
          .from("attendances")
          .select("session_id, student_id")
          .in("session_id", sessionIds);

        const existingAttSet = new Set(
          (existingAtt || []).map(a => `${a.session_id}_${a.student_id}`)
        );

        const newAttendances = attendanceRecords.filter(
          a => !existingAttSet.has(`${a.session_id}_${a.student_id}`)
        );

        if (newAttendances.length > 0) {
          await adminClient.from("attendances").insert(newAttendances);
        }
      }
    }

    return new Response(JSON.stringify({ created: newSessions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
