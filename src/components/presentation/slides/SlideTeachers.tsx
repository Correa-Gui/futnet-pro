import SlideLayout from '../SlideLayout';
import { UserCheck, DollarSign, GraduationCap, Calendar } from 'lucide-react';

const teachers = [
  { name: 'Prof. Ricardo', classes: 6, rate: 'R$ 80/aula', total: 'R$ 2.880', avatar: 'RP' },
  { name: 'Prof. Fernanda', classes: 8, rate: 'R$ 75/aula', total: 'R$ 3.600', avatar: 'FL' },
  { name: 'Prof. Marcos', classes: 4, rate: 'R$ 90/aula', total: 'R$ 2.160', avatar: 'MS' },
];

export default function SlideTeachers() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Professores</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Gerencie professores e pagamentos automaticamente
        </h2>
        <p className="text-2xl text-white/50 mb-12">Cadastro, valor por aula, cálculo automático de pagamentos mensais.</p>

        <div className="grid grid-cols-3 gap-8 flex-1">
          {teachers.map((t, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[hsl(201,80%,30%)]/40 flex items-center justify-center">
                  <span className="text-2xl font-bold text-[hsl(201,80%,50%)]">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{t.name}</p>
                  <p className="text-lg text-white/40">FutVôlei & Beach Tennis</p>
                </div>
              </div>
              <div className="space-y-5 flex-1">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-white/30" />
                  <span className="text-xl text-white/60">{t.classes} turmas ativas</span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-white/30" />
                  <span className="text-xl text-white/60">{t.rate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-white/30" />
                  <span className="text-xl text-white/60">~36 aulas/mês</span>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-lg text-white/40">Pagamento mensal</p>
                <p className="text-3xl font-bold text-[hsl(25,95%,53%)]">{t.total}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
