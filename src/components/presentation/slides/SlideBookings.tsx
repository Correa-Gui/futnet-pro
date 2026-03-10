import SlideLayout from '../SlideLayout';
import { CalendarDays, MapPin, Clock, CreditCard } from 'lucide-react';

const slots = ['07:00', '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function SlideBookings() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Agendamentos</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Reserva de quadras online com pagamento PIX
        </h2>
        <p className="text-2xl text-white/50 mb-12">Qualquer pessoa pode reservar uma quadra pelo site, sem precisar de cadastro.</p>

        <div className="flex-1 flex gap-8">
          {/* Calendar grid */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <CalendarDays className="w-6 h-6 text-[hsl(201,80%,50%)]" />
              <span className="text-2xl font-semibold">Quadra 1 — Sand Court</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {['Seg 10', 'Ter 11', 'Qua 12', 'Qui 13', 'Sex 14'].map((day, di) => (
                <div key={di}>
                  <p className="text-lg text-white/40 text-center mb-3 font-medium">{day}</p>
                  {slots.map((slot, si) => {
                    const occupied = Math.random() > 0.6;
                    const isClass = Math.random() > 0.7 && !occupied;
                    return (
                      <div key={si} className={`mb-2 rounded-lg px-3 py-2 text-center text-base ${
                        occupied ? 'bg-[hsl(25,95%,53%)]/20 text-[hsl(25,95%,53%)] border border-[hsl(25,95%,53%)]/30' :
                        isClass ? 'bg-[hsl(201,80%,30%)]/30 text-[hsl(201,80%,50%)] border border-[hsl(201,80%,50%)]/20' :
                        'bg-white/5 text-white/30 border border-white/5'
                      }`}>
                        {slot}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Booking info */}
          <div className="w-[400px] flex flex-col gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex-1">
              <p className="text-2xl font-semibold mb-6">Legenda</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3"><div className="w-6 h-4 rounded bg-white/5 border border-white/10" /><span className="text-lg text-white/60">Disponível</span></div>
                <div className="flex items-center gap-3"><div className="w-6 h-4 rounded bg-[hsl(25,95%,53%)]/20 border border-[hsl(25,95%,53%)]/30" /><span className="text-lg text-white/60">Reservado</span></div>
                <div className="flex items-center gap-3"><div className="w-6 h-4 rounded bg-[hsl(201,80%,30%)]/30 border border-[hsl(201,80%,50%)]/20" /><span className="text-lg text-white/60">Aula agendada</span></div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <p className="text-2xl font-semibold mb-4">Fluxo do Cliente</p>
              <div className="space-y-4">
                {[
                  { icon: CalendarDays, text: 'Escolhe data e horário' },
                  { icon: MapPin, text: 'Seleciona a quadra' },
                  { icon: CreditCard, text: 'Paga via PIX' },
                  { icon: Clock, text: 'Recebe confirmação' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[hsl(25,95%,53%)]/20 flex items-center justify-center text-sm font-bold text-[hsl(25,95%,53%)]">{i+1}</div>
                    <step.icon className="w-5 h-5 text-white/30" />
                    <span className="text-lg text-white/60">{step.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
