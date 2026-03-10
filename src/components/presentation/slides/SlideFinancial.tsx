import SlideLayout from '../SlideLayout';
import { Receipt, QrCode, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SlideFinancial() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Financeiro</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Cobranças PIX automáticas e controle total
        </h2>
        <p className="text-2xl text-white/50 mb-12">Gere faturas, envie cobranças PIX e acompanhe pagamentos em tempo real.</p>

        <div className="flex-1 flex gap-8">
          {/* Invoice mockup */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <p className="text-2xl font-semibold">Faturas Recentes</p>
              <span className="text-lg text-white/40">Março 2026</span>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Ana Silva', amount: 'R$ 280', status: 'Pago', statusColor: 'text-emerald-400', icon: CheckCircle2 },
                { name: 'Carlos Lima', amount: 'R$ 180', status: 'Pago', statusColor: 'text-emerald-400', icon: CheckCircle2 },
                { name: 'Mariana Costa', amount: 'R$ 280', status: 'Pendente', statusColor: 'text-yellow-400', icon: AlertTriangle },
                { name: 'Pedro Santos', amount: 'R$ 180', status: 'Vencida', statusColor: 'text-red-400', icon: AlertTriangle },
                { name: 'Juliana Rocha', amount: 'R$ 280', status: 'Pago', statusColor: 'text-emerald-400', icon: CheckCircle2 },
              ].map((inv, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl px-6 py-5">
                  <Receipt className="w-5 h-5 text-white/30" />
                  <span className="text-xl font-medium flex-1">{inv.name}</span>
                  <span className="text-xl text-white/60">{inv.amount}</span>
                  <inv.icon className={`w-5 h-5 ${inv.statusColor}`} />
                  <span className={`text-lg font-medium min-w-[100px] text-right ${inv.statusColor}`}>{inv.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PIX mockup */}
          <div className="w-[450px] bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center">
            <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center mb-8">
              <QrCode className="w-36 h-36 text-[hsl(213,45%,10%)]" />
            </div>
            <p className="text-2xl font-bold mb-2">Cobrança PIX</p>
            <p className="text-4xl font-bold text-[hsl(25,95%,53%)] mb-4">R$ 280,00</p>
            <p className="text-lg text-white/40 text-center">QR Code gerado automaticamente via Mercado Pago</p>
            <div className="mt-6 bg-emerald-500/20 text-emerald-400 rounded-full px-6 py-2 text-lg font-medium">
              Pagamento confirmado ✓
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
