const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();

const data = [
  ['ESTADO DE RESULTADOS — SNACK', '', ''],
  ['Restaurante formato barra, Buenos Aires', '', ''],
  ['Valores mensuales USD (steady state - Diciembre)', '', ''],
  ['', '', ''],
  ['', 'MONTO', '% s/ Rev'],
  ['', '', ''],
  ['Revenue Total', 55725, {f:'B7/B7'}],
  ['', '', ''],
  ['(-) Food Cost', {f:'-B7*0.25'}, {f:'-B9/B7'}],
  ['(-) Paper / Descartables', {f:'-B7*0.025'}, {f:'-B10/B7'}],
  ['(-) Comisiones Pago', {f:'-B7*0.8*0.012'}, {f:'-B11/B7'}],
  ['(-) Marketing', {f:'-B7*0.03'}, {f:'-B12/B7'}],
  ['', '', ''],
  ['MARGEN BRUTO', {f:'B7+B9+B10+B11+B12'}, {f:'B14/B7'}],
  ['', '', ''],
  ['(-) Staff (14 × $1,150)', {f:'-14*1150'}, {f:'-B16/B7'}],
  ['(-) Alquiler', -3400, {f:'-B17/B7'}],
  ['(-) Servicios', -1350, {f:'-B18/B7'}],
  ['(-) Contador', -500, {f:'-B19/B7'}],
  ['(-) Software', -300, {f:'-B20/B7'}],
  ['(-) Seguros', -300, {f:'-B21/B7'}],
  ['', '', ''],
  ['EBITDA', {f:'B14+B16+B17+B18+B19+B20+B21'}, {f:'B23/B7'}],
  ['', '', ''],
  ['IMPUESTOS', '', ''],
  ['', '', ''],
  ['(-) IVA Débito', {f:'B7*0.8*0.21/1.21'}, ''],
  ['(+) IVA Crédito Food+Paper blanco', {f:'(-B9+-B10)*0.8*0.21/1.21'}, ''],
  ['(+) IVA Crédito Serv+Cont+Soft+Seg', {f:'(-B18+-B19+-B20+-B21)*0.21/1.21'}, ''],
  ['(-) IVA A PAGAR', {f:'-MAX(0,B27-B28-B29)'}, {f:'-B30/B7'}],
  ['', '', ''],
  ['(-) IIBB (3.5% s/ rev blanco neto IVA)', {f:'-B7*0.8/1.21*0.035'}, {f:'-B32/B7'}],
  ['', '', ''],
  ['(-) Déb/Créd (1.2% s/ rev blanco)', {f:'-B7*0.8*0.012'}, {f:'-B34/B7'}],
  ['', '', ''],
  ['(-) Ganancias (35% s/ base imponible)', '', ''],
  ['    Rev Blanco', {f:'B7*0.8'}, ''],
  ['    (-) Costos deducibles', {f:'(-B9+-B10)*0.8+B11+B12+B16+B17+B18+B19+B20+B21'}, ''],
  ['    (-) IVA+IIBB+DC', {f:'B30+B32+B34'}, ''],
  ['    = Base imponible', {f:'B37+B38+B39'}, ''],
  ['(-) GANANCIAS A PAGAR', {f:'-MAX(0,B40)*0.35'}, {f:'-B41/B7'}],
  ['', '', ''],
  ['TOTAL IMPUESTOS', {f:'B30+B32+B34+B41'}, {f:'-B43/B7'}],
  ['', '', ''],
  ['NET INCOME', {f:'B23+B43'}, {f:'B45/B7'}],
];

const ws = XLSX.utils.aoa_to_sheet(data);
ws['!cols'] = [{wch:40},{wch:18},{wch:12}];

// Format
for (let r = 0; r < data.length; r++) {
  const cellB = ws[XLSX.utils.encode_cell({r, c:1})];
  if (cellB && (cellB.f || typeof cellB.v === 'number')) cellB.z = '#,##0';
  const cellC = ws[XLSX.utils.encode_cell({r, c:2})];
  if (cellC && cellC.f) cellC.z = '0.0%';
}

XLSX.utils.book_append_sheet(wb, ws, 'PnL');
XLSX.writeFile(wb, '/Users/marcoshuergo/Documents/CURSO CLAUDE CODE/gastro-simulator/SNACK-PnL.xlsx');
console.log('OK');
