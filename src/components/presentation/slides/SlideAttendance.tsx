import SlideLayout from '../SlideLayout';
import { QrCode, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function SlideAttendance() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Controle de Presença</p>
        <h2 className="text-5xl font-bold mb-12" style={{ fontFamily: 'Syne, sans-serif' }}>
          Presença digital com confirmação inteligente
        </h2>

        <div className="flex-1 flex gap-10">
          {/* QR Code mockup */}
          <div className="w-[500px] bg-white/5 border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center">
            <div className="w-64 h-64 bg-white rounded-2xl flex items-center justify-center mb-8">
              <QrCode className="w-48 h-48 text-[hsl(213,45%,10%)]" />
            </div>
            <p className="text-2xl font-bold mb-2">QR Code da Aula</p>
            <p className="text-lg text-white/40 text-center">Aluno escaneia para confirmar presença automaticamente</p>
          </div>

          {/* Attendance list */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8">
            <p className="text-2xl font-semibold mb-6">Turma Avançado B — Hoje 07:00</p>
            <div className="space-y-4">
              {[
                { name: 'Ana Silva', status: 'Presente', icon: CheckCircle2, color: 'text-emerald-400' },
                { name: 'Carlos Lima', status: 'Presente', icon: CheckCircle2, color: 'text-emerald-400' },
                { name: 'Juliana Rocha', status: 'Presente', icon: CheckCircle2, color: 'text-emerald-400' },
                { name: 'Pedro Santos', status: 'Ausente', icon: XCircle, color: 'text-red-400' },
                { name: 'Mariana Costa', status: 'Pendente', icon: Clock, color: 'text-yellow-400' },
                { name: 'Roberto Alves', status: 'Presente', icon: CheckCircle2, color: 'text-emerald-400' },
                { name: 'Fernanda Lima', status: 'Presente', icon: CheckCircle2, color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl px-6 py-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-semibold">{s.name.split(' ').map(n=>n[0]).join('')}</span>
                  </div>
                  <span className="text-xl font-medium flex-1">{s.name}</span>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                  <span className={`text-lg font-medium ${s.color}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
