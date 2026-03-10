import SlideLayout from '../SlideLayout';
import { Users, UserPlus, Search, Filter } from 'lucide-react';

const students = [
  { name: 'Ana Silva', plan: 'Premium 3x', status: 'Ativo', level: 'Avançado' },
  { name: 'Carlos Lima', plan: 'Básico 2x', status: 'Ativo', level: 'Intermediário' },
  { name: 'Mariana Costa', plan: 'Premium 3x', status: 'Ativo', level: 'Iniciante' },
  { name: 'Pedro Santos', plan: 'Básico 2x', status: 'Inadimplente', level: 'Elementar' },
  { name: 'Juliana Rocha', plan: 'Premium 3x', status: 'Ativo', level: 'Avançado' },
];

export default function SlideStudents() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Gestão de Alunos</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Cadastro completo com perfil e histórico
        </h2>
        <p className="text-2xl text-white/50 mb-10">Busca, filtros, matrícula em turmas e controle de inadimplência — tudo em um lugar.</p>

        {/* Mock toolbar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex-1 max-w-[400px]">
            <Search className="w-5 h-5 text-white/30" />
            <span className="text-lg text-white/30">Buscar aluno...</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
            <Filter className="w-5 h-5 text-white/40" />
            <span className="text-lg text-white/40">Filtros</span>
          </div>
          <div className="flex items-center gap-2 bg-[hsl(25,95%,53%)] rounded-xl px-6 py-3 ml-auto">
            <UserPlus className="w-5 h-5" />
            <span className="text-lg font-semibold">Novo Aluno</span>
          </div>
        </div>

        {/* Mock table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex-1">
          <div className="grid grid-cols-5 gap-4 px-8 py-5 border-b border-white/10 text-white/40 text-lg font-medium">
            <span>Nome</span><span>Plano</span><span>Nível</span><span>Status</span><span>Ações</span>
          </div>
          {students.map((s, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 px-8 py-5 border-b border-white/5 items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(201,80%,30%)]/40 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[hsl(201,80%,50%)]">{s.name.split(' ').map(n=>n[0]).join('')}</span>
                </div>
                <span className="text-xl font-medium">{s.name}</span>
              </div>
              <span className="text-xl text-white/60">{s.plan}</span>
              <span className="text-xl text-white/60">{s.level}</span>
              <span className={`text-xl font-medium ${s.status === 'Ativo' ? 'text-emerald-400' : 'text-red-400'}`}>{s.status}</span>
              <span className="text-xl text-white/30">•••</span>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
