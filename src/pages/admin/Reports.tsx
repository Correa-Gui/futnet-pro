import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileDown } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExcelJS from 'exceljs';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CURRENCY_FMT = '"R$" #,##0.00';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri',
};
const TOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' },
};
const TOTAL_FONT: Partial<ExcelJS.Font> = { bold: true, size: 11, name: 'Calibri' };
const TITLE_FONT: Partial<ExcelJS.Font> = {
  bold: true, size: 14, color: { argb: 'FF1B5E20' }, name: 'Calibri',
};
const EVEN_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FBE7' },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  left:   { style: 'thin', color: { argb: 'FFCCCCCC' } },
  right:  { style: 'thin', color: { argb: 'FFCCCCCC' } },
};

type ColDef = {
  label: string;
  width: number;
  align?: ExcelJS.Alignment['horizontal'];
  numFmt?: string;
  isTotal?: boolean;
};

type SheetDef = {
  name: string;
  title: string;
  cols: ColDef[];
  rows: (string | number)[][];
};

function colLetter(n: number): string {
  return String.fromCharCode(64 + n);
}

async function buildXLSX(sheets: SheetDef[], filename: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FutPro';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name, {
      views: [{ showGridLines: true }],
    });

    const colCount = sheet.cols.length;
    const lastCol = colLetter(colCount);

    // Title row
    ws.mergeCells(`A1:${lastCol}1`);
    const titleCell = ws.getCell('A1');
    titleCell.value = sheet.title;
    titleCell.font = TITLE_FONT;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    // Empty row
    ws.getRow(2).height = 6;

    // Header row (row 3)
    sheet.cols.forEach((col, i) => {
      const cell = ws.getCell(3, i + 1);
      cell.value = col.label;
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: col.align || 'left', vertical: 'middle' };
    });
    ws.getRow(3).height = 22;

    // Data rows starting at row 4
    sheet.rows.forEach((row, ri) => {
      const rowNum = ri + 4;
      row.forEach((val, ci) => {
        const cell = ws.getCell(rowNum, ci + 1);
        cell.value = val;
        if (sheet.cols[ci].numFmt) cell.numFmt = sheet.cols[ci].numFmt!;
        cell.border = THIN_BORDER;
        cell.alignment = { horizontal: sheet.cols[ci].align || 'left', vertical: 'middle' };
        if (ri % 2 === 1) cell.fill = EVEN_FILL;
      });
      ws.getRow(rowNum).height = 18;
    });

    // Total row
    const totalRowNum = sheet.rows.length + 4;
    ws.mergeCells(`A${totalRowNum}:B${totalRowNum}`);
    const labelCell = ws.getCell(`A${totalRowNum}`);
    labelCell.value = 'TOTAL';
    labelCell.fill = TOTAL_FILL;
    labelCell.font = TOTAL_FONT;
    labelCell.border = THIN_BORDER;
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    sheet.cols.forEach((col, i) => {
      if (i < 2) return;
      const cell = ws.getCell(totalRowNum, i + 1);
      if (col.isTotal) {
        const dataStart = 4;
        const dataEnd = totalRowNum - 1;
        const colL = colLetter(i + 1);
        cell.value = { formula: `SUM(${colL}${dataStart}:${colL}${dataEnd})` };
        cell.numFmt = col.numFmt || 'general';
        cell.font = TOTAL_FONT;
      }
      cell.fill = TOTAL_FILL;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: col.align || 'left', vertical: 'middle' };
    });
    ws.getRow(totalRowNum).height = 22;

    // Column widths
    sheet.cols.forEach((col, i) => {
      ws.getColumn(i + 1).width = col.width;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const INVOICE_STATUS: Record<string, string> = {
  pending: 'Pendente', paid: 'Pago', overdue: 'Vencida', cancelled: 'Cancelada',
};
const BOOKING_STATUS: Record<string, string> = {
  requested: 'Solicitado', confirmed: 'Confirmado', paid: 'Pago', cancelled: 'Cancelado',
};

export default function Reports() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );
  const [exporting, setExporting] = useState(false);

  const monthStart = startOfMonth(new Date(selectedMonth + '-02'));
  const monthEnd = endOfMonth(monthStart);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
  const monthLabel = format(monthStart, 'MMMM yyyy', { locale: ptBR });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['reports-invoices', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid')
        .gte('due_date', monthStartStr)
        .lte('due_date', monthEndStr)
        .order('due_date', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const studentIds = [...new Set(data.map(i => i.student_id))];
      const { data: sps } = await supabase
        .from('student_profiles').select('id, user_id').in('id', studentIds);
      const userIds = (sps || []).map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('user_id, full_name').in('user_id', userIds);
      const userToName = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      const studentToUser = Object.fromEntries((sps || []).map(s => [s.id, s.user_id]));
      return data.map(i => ({
        ...i,
        studentName: userToName[studentToUser[i.student_id]] || 'Aluno',
        finalAmount: Number(i.amount) - Number(i.discount || 0),
      }));
    },
  });

  const { data: rentals = [], isLoading: loadingRentals } = useQuery({
    queryKey: ['reports-rentals', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('court_bookings').select('*, courts(name)')
        .eq('booking_type', 'rental').eq('status', 'paid')
        .gte('date', monthStartStr).lte('date', monthEndStr)
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: dayUses = [], isLoading: loadingDayUse } = useQuery({
    queryKey: ['reports-dayuse', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('court_bookings').select('*, courts(name)')
        .eq('booking_type', 'day_use').eq('status', 'paid')
        .gte('date', monthStartStr).lte('date', monthEndStr)
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  function invoiceSheet(title: string): SheetDef {
    return {
      name: 'Alunos',
      title,
      cols: [
        { label: 'Aluno',      width: 28 },
        { label: 'Referência', width: 16 },
        { label: 'Vencimento', width: 14, align: 'center' },
        { label: 'Valor (R$)', width: 16, align: 'right', numFmt: CURRENCY_FMT, isTotal: true },
        { label: 'Desconto (R$)', width: 16, align: 'right', numFmt: CURRENCY_FMT, isTotal: true },
        { label: 'Total Pago (R$)', width: 18, align: 'right', numFmt: CURRENCY_FMT, isTotal: true },
      ],
      rows: invoices.map(i => [
        i.studentName,
        i.reference_month || '',
        format(parseISO(i.due_date), 'dd/MM/yyyy'),
        Number(i.amount),
        Number(i.discount || 0),
        i.finalAmount,
      ]),
    };
  }

  function rentalSheet(title: string): SheetDef {
    return {
      name: 'Aluguéis',
      title,
      cols: [
        { label: 'Data',        width: 13, align: 'center' },
        { label: 'Horário',     width: 18, align: 'center' },
        { label: 'Quadra',      width: 18 },
        { label: 'Solicitante', width: 26 },
        { label: 'Telefone',    width: 18 },
        { label: 'Valor (R$)',  width: 16, align: 'right', numFmt: CURRENCY_FMT, isTotal: true },
      ],
      rows: rentals.map(b => [
        format(parseISO(b.date), 'dd/MM/yyyy'),
        `${b.start_time} – ${b.end_time}`,
        (b.courts as any)?.name || '-',
        b.requester_name || '-',
        (b as any).requester_phone || '-',
        Number(b.price || 0),
      ]),
    };
  }

  function dayUseSheet(title: string): SheetDef {
    return {
      name: 'Day Use',
      title,
      cols: [
        { label: 'Data',        width: 13, align: 'center' },
        { label: 'Horário',     width: 18, align: 'center' },
        { label: 'Quadra',      width: 18 },
        { label: 'Solicitante', width: 26 },
        { label: 'Telefone',    width: 18 },
        { label: 'Valor (R$)',  width: 16, align: 'right', numFmt: CURRENCY_FMT, isTotal: true },
      ],
      rows: dayUses.map(b => [
        format(parseISO(b.date), 'dd/MM/yyyy'),
        `${b.start_time} – ${b.end_time}`,
        (b.courts as any)?.name || '-',
        b.requester_name || '-',
        (b as any).requester_phone || '-',
        Number(b.price || 0),
      ]),
    };
  }

  async function handleExport(fn: () => Promise<void>) {
    setExporting(true);
    try { await fn(); } finally { setExporting(false); }
  }

  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const invoiceTotal = invoices.reduce((s, i) => s + i.finalAmount, 0);
  const rentalTotal  = rentals.reduce((s, b) => s + Number(b.price || 0), 0);
  const dayUseTotal  = dayUses.reduce((s, b) => s + Number(b.price || 0), 0);
  const grandTotal   = invoiceTotal + rentalTotal + dayUseTotal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold font-brand">Relatórios</h2>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel} — apenas pagamentos confirmados</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          />
          <Button
            disabled={exporting}
            onClick={() => handleExport(() => buildXLSX([
              invoiceSheet(`Alunos — ${monthTitle}`),
              rentalSheet(`Aluguéis — ${monthTitle}`),
              dayUseSheet(`Day Use — ${monthTitle}`),
            ], `relatorio-${selectedMonth}.xlsx`))}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {exporting ? 'Gerando...' : 'Exportar Tudo'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Alunos</p>
            <p className="text-xl font-bold">{formatCurrency(invoiceTotal)}</p>
            <p className="text-xs text-muted-foreground">{invoices.length} fatura(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Aluguéis</p>
            <p className="text-xl font-bold">{formatCurrency(rentalTotal)}</p>
            <p className="text-xs text-muted-foreground">{rentals.length} reserva(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Day Use</p>
            <p className="text-xl font-bold">{formatCurrency(dayUseTotal)}</p>
            <p className="text-xs text-muted-foreground">{dayUses.length} reserva(s)</p>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Geral</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
            <p className="text-xs text-muted-foreground">{invoices.length + rentals.length + dayUses.length} registros</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="alugueis">Aluguéis</TabsTrigger>
          <TabsTrigger value="dayuse">Day Use</TabsTrigger>
        </TabsList>

        {/* ALL */}
        <TabsContent value="all" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled={exporting}
              onClick={() => handleExport(() => buildXLSX([
                invoiceSheet(`Alunos — ${monthTitle}`),
                rentalSheet(`Aluguéis — ${monthTitle}`),
                dayUseSheet(`Day Use — ${monthTitle}`),
              ], `relatorio-${selectedMonth}.xlsx`))}
            >
              <Download className="mr-2 h-4 w-4" />XLSX Completo
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Aluno / Solicitante</TableHead>
                    <TableHead>Data / Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loadingInvoices || loadingRentals || loadingDayUse) ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : (invoices.length + rentals.length + dayUses.length) === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                  ) : (
                    <>
                      {invoices.map(i => (
                        <TableRow key={`inv-${i.id}`}>
                          <TableCell><Badge variant="outline">Aluno</Badge></TableCell>
                          <TableCell>{i.studentName}</TableCell>
                          <TableCell>{format(parseISO(i.due_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(i.finalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      {rentals.map(b => (
                        <TableRow key={`rent-${b.id}`}>
                          <TableCell><Badge variant="secondary">Aluguel</Badge></TableCell>
                          <TableCell>{b.requester_name || '-'}</TableCell>
                          <TableCell>{format(parseISO(b.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(b.price || 0))}</TableCell>
                        </TableRow>
                      ))}
                      {dayUses.map(b => (
                        <TableRow key={`du-${b.id}`}>
                          <TableCell><Badge>Day Use</Badge></TableCell>
                          <TableCell>{b.requester_name || '-'}</TableCell>
                          <TableCell>{format(parseISO(b.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(b.price || 0))}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(grandTotal)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALUNOS */}
        <TabsContent value="alunos" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled={exporting}
              onClick={() => handleExport(() => buildXLSX(
                [invoiceSheet(`Alunos — ${monthTitle}`)],
                `alunos-${selectedMonth}.xlsx`
              ))}
            >
              <Download className="mr-2 h-4 w-4" />Exportar XLSX
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Total Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingInvoices ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma fatura encontrada</TableCell></TableRow>
                  ) : (
                    <>
                      {invoices.map(i => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.studentName}</TableCell>
                          <TableCell>{i.reference_month || '-'}</TableCell>
                          <TableCell>{format(parseISO(i.due_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(i.amount))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(i.discount || 0))}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(i.finalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(invoiceTotal)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALUGUEIS */}
        <TabsContent value="alugueis" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled={exporting}
              onClick={() => handleExport(() => buildXLSX(
                [rentalSheet(`Aluguéis — ${monthTitle}`)],
                `alugueis-${selectedMonth}.xlsx`
              ))}
            >
              <Download className="mr-2 h-4 w-4" />Exportar XLSX
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Quadra</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRentals ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : rentals.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aluguel encontrado</TableCell></TableRow>
                  ) : (
                    <>
                      {rentals.map(b => (
                        <TableRow key={b.id}>
                          <TableCell>{format(parseISO(b.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{b.start_time} – {b.end_time}</TableCell>
                          <TableCell>{(b.courts as any)?.name || '-'}</TableCell>
                          <TableCell>{b.requester_name || '-'}</TableCell>
                          <TableCell>{(b as any).requester_phone || '-'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(b.price || 0))}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(rentalTotal)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DAY USE */}
        <TabsContent value="dayuse" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled={exporting}
              onClick={() => handleExport(() => buildXLSX(
                [dayUseSheet(`Day Use — ${monthTitle}`)],
                `day-use-${selectedMonth}.xlsx`
              ))}
            >
              <Download className="mr-2 h-4 w-4" />Exportar XLSX
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Quadra</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDayUse ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : dayUses.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum day use encontrado</TableCell></TableRow>
                  ) : (
                    <>
                      {dayUses.map(b => (
                        <TableRow key={b.id}>
                          <TableCell>{format(parseISO(b.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{b.start_time} – {b.end_time}</TableCell>
                          <TableCell>{(b.courts as any)?.name || '-'}</TableCell>
                          <TableCell>{b.requester_name || '-'}</TableCell>
                          <TableCell>{(b as any).requester_phone || '-'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(b.price || 0))}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(dayUseTotal)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
