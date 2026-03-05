export default function TeacherHome() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Aulas de Hoje</h2>
        <p className="text-sm text-muted-foreground">Lista de presença e turmas do dia</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground">Nenhuma aula agendada para hoje.</p>
      </div>
    </div>
  );
}
