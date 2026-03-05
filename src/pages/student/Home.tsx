export default function StudentHome() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Minhas Aulas</h2>
        <p className="text-sm text-muted-foreground">Próximas aulas e confirmações de presença</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground">Nenhuma aula próxima encontrada.</p>
        <p className="mt-1 text-sm text-muted-foreground">Você será notificado quando houver aulas agendadas.</p>
      </div>
    </div>
  );
}
