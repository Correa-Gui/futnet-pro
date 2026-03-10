import SlideLayout from '../SlideLayout';
import { Clock, MapPin, Users } from 'lucide-react';

const classes = [
  { name: 'Turma Iniciante A', time: 'Seg/Qua 08:00–09:00', court: 'Quadra 1', students: '8/12', level: 'Iniciante', color: 'bg-emerald-500' },
  { name: 'Turma Avançado B', time: 'Ter/Qui 07:00–08:30', court: 'Quadra 2', students: '10/10', level: 'Avançado', color: 'bg-[hsl(25,95%,53%)]' },
  { name: 'Turma Intermediário C', time: 'Seg/Qua/Sex 17:00–18:00', court: 'Quadra 1', students: '6/12', level: 'Intermediário', color: 'bg-[hsl(201,80%,50%)]' },
  { name: 'Turma Kids', time: 'Sáb 09:00–10:00', court: 'Quadra 3', students: '12/15', level: 'Elementar', color: 'bg-purple-500' },
];

export default function SlideClasses() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Turmas e Horários</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Organize turmas, horários e quadras com facilidade
        </h2>
        <p className="text-2xl text-white/50 mb-12">Visualize turmas em cards, gerencie vagas e alocação de professores.</p>

        <div className="grid grid-cols-2 gap-8 flex-1">
          {classes.map((c, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-3 h-3 rounded-full ${c.color}`} />
                <h3 className="text-2xl font-bold">{c.name}</h3>
                <span className="ml-auto text-lg text-white/40 bg-white/5 px-4 py-1 rounded-full">{c.level}</span>
              </div>
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3 text-xl text-white/60">
                  <Clock className="w-5 h-5 text-white/30" /> {c.time}
                </div>
                <div className="flex items-center gap-3 text-xl text-white/60">
                  <MapPin className="w-5 h-5 text-white/30" /> {c.court}
                </div>
                <div className="flex items-center gap-3 text-xl text-white/60">
                  <Users className="w-5 h-5 text-white/30" /> {c.students} alunos
                </div>
              </div>
              <div className="mt-6 w-full bg-white/10 rounded-full h-3">
                <div className={`h-3 rounded-full ${c.color}`} style={{ width: `${parseInt(c.students) / parseInt(c.students.split('/')[1]) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
