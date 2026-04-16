const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();

// ── INPUTS ──
const inputData = [
  ['INPUTS', '', ''],
  ['', '', ''],
  ['Revenue Total', 55725, ''],
  ['% Blanco', 0.80, ''],
  ['% Negro', 0.20, ''],
  ['Food Cost %', 0.25, ''],
  ['Paper Cost %', 0.025, ''],
  ['Comisiones Pago %', 0.012, ''],
  ['Marketing %', 0.03, ''],
  ['Staff (personas)', 14, ''],
  ['Sueldo / persona', 1150, ''],
  ['Alquiler', 3400, ''],
  ['Servicios', 1350, ''],
  ['Contador', 500, ''],
  ['Software', 300, ''],
  ['Seguros', 300, ''],
  ['% Compras en Blanco', 0.80, ''],
  ['IVA %', 0.21, ''],
  ['IIBB %', 0.035, ''],
  ['Déb/Créd %', 0.012, ''],
  ['Ganancias %', 0.35, ''],
];

const wsInputs = XLSX.utils.aoa_to_sheet(inputData);
// Format percentages
[3,4,5,6,7,8,16,17,18,19,20].forEach(r => {
  const cell = wsInputs[XLSX.utils.encode_cell({r, c:1})];
  if (cell) cell.z = '0.0%';
});
wsInputs['!cols'] = [{wch:25},{wch:15},{wch:40}];

// ── ESTADO DE RESULTADOS ──
const pnlData = [
  ['ESTADO DE RESULTADOS', 'MONTO', 'FÓRMULA', '% s/ Revenue', 'NOTAS'],
  ['', '', '', '', ''],
  // Revenue
  ['REVENUE', '', '', '', ''],
  ['Revenue Total', {f:'Inputs!B3'}, '', {f:'B4/B4'}, ''],
  ['  Revenue Blanco', {f:'B4*Inputs!B4'}, {t:'s',v:'= Rev Total × % Blanco'}, {f:'B5/B4'}, 'Sobre este se calculan impuestos'],
  ['  Revenue Negro', {f:'B4*Inputs!B5'}, {t:'s',v:'= Rev Total × % Negro'}, {f:'B6/B4'}, 'Cash, no paga impuestos ni comisiones'],
  ['', '', '', '', ''],
  // Costos Variables
  ['COSTOS VARIABLES', '', '', '', ''],
  ['  Food Cost', {f:'-B4*Inputs!B6'}, {t:'s',v:'= -Rev Total × Food Cost %'}, {f:'-B9/B4'}, ''],
  ['  Paper / Descartables', {f:'-B4*Inputs!B7'}, {t:'s',v:'= -Rev Total × Paper %'}, {f:'-B10/B4'}, ''],
  ['  Comisiones Pago', {f:'-B5*Inputs!B8'}, {t:'s',v:'= -Rev Blanco × Comisiones %'}, {f:'-B11/B4'}, 'Solo sobre blanco - negro es cash'],
  ['  Marketing', {f:'-B4*Inputs!B9'}, {t:'s',v:'= -Rev Total × Marketing %'}, {f:'-B12/B4'}, ''],
  ['Total Costos Variables', {f:'B9+B10+B11+B12'}, '', {f:'-B13/B4'}, ''],
  ['', '', '', '', ''],
  // Costos Fijos
  ['COSTOS FIJOS', '', '', '', ''],
  ['  Staff', {f:'-Inputs!B10*Inputs!B11'}, {t:'s',v:'= -Personas × Sueldo'}, {f:'-B16/B4'}, 'CONSULTAR: ¿incluye cargas patronales?'],
  ['  Alquiler', {f:'-Inputs!B12'}, '', {f:'-B17/B4'}, ''],
  ['  Servicios', {f:'-Inputs!B13'}, '', {f:'-B18/B4'}, ''],
  ['  Contador', {f:'-Inputs!B14'}, '', {f:'-B19/B4'}, ''],
  ['  Software', {f:'-Inputs!B15'}, '', {f:'-B20/B4'}, ''],
  ['  Seguros', {f:'-Inputs!B16'}, '', {f:'-B21/B4'}, ''],
  ['Total Costos Fijos', {f:'B16+B17+B18+B19+B20+B21'}, '', {f:'-B22/B4'}, ''],
  ['', '', '', '', ''],
  // EBITDA
  ['TOTAL COSTOS', {f:'B13+B22'}, '', {f:'-B24/B4'}, ''],
  ['', '', '', '', ''],
  ['EBITDA', {f:'B4+B24'}, {t:'s',v:'= Revenue + Total Costos (costos son negativos)'}, {f:'B26/B4'}, ''],
  ['', '', '', '', ''],
  // Impuestos
  ['IMPUESTOS (solo sobre blanco)', '', '', '', ''],
  ['', '', '', '', ''],
  ['1. IVA', '', '', '', ''],
  ['  IVA Débito', {f:'B5*Inputs!B18/(1+Inputs!B18)'}, {t:'s',v:'= Rev Blanco × 21% / 1.21'}, '', 'Precios incluyen IVA'],
  ['  Compras con crédito fiscal:', '', '', '', ''],
  ['    Food en blanco', {f:'-B9*Inputs!B17'}, {t:'s',v:'= Food Cost × % Compras Blanco'}, '', ''],
  ['    Paper en blanco', {f:'-B10*Inputs!B17'}, {t:'s',v:'= Paper Cost × % Compras Blanco'}, '', ''],
  ['    Servicios', {f:'-B18'}, '', '', ''],
  ['    Contador', {f:'-B19'}, '', '', ''],
  ['    Software', {f:'-B20'}, '', '', ''],
  ['    Seguros', {f:'-B21'}, '', '', ''],
  ['    Total compras c/ crédito', {f:'B33+B34+B35+B36+B37+B38'}, '', '', ''],
  ['  IVA Crédito', {f:'B39*Inputs!B18/(1+Inputs!B18)'}, {t:'s',v:'= Total compras × 21% / 1.21'}, '', ''],
  ['  IVA A PAGAR', {f:'-MAX(0,B31-B40)'}, {t:'s',v:'= -(Débito - Crédito)'}, {f:'-B41/B4'}, 'CONSULTAR: ¿alquiler genera crédito IVA?'],
  ['', '', '', '', ''],
  ['2. IIBB', '', '', '', ''],
  ['  Base (Rev blanco neto IVA)', {f:'B5/(1+Inputs!B18)'}, {t:'s',v:'= Rev Blanco / 1.21'}, '', 'CONSULTAR: ¿base neta de IVA?'],
  ['  IIBB A PAGAR', {f:'-B44*Inputs!B19'}, {t:'s',v:'= -Base × 3.5%'}, {f:'-B45/B4'}, ''],
  ['', '', '', '', ''],
  ['3. Déb/Créd Bancarios', '', '', '', ''],
  ['  Base (Rev blanco con IVA)', {f:'B5'}, '', '', ''],
  ['  DÉB/CRÉD A PAGAR', {f:'-B48*Inputs!B20'}, {t:'s',v:'= -Base × 1.2%'}, {f:'-B49/B4'}, ''],
  ['', '', '', '', ''],
  ['4. Ganancias', '', '', '', ''],
  ['  Rev Blanco', {f:'B5'}, '', '', ''],
  ['  - Food+Paper en blanco', {f:'-((-B9+-B10)*Inputs!B17)'}, {t:'s',v:'= -(Food+Paper) × % Compras Blanco'}, '', ''],
  ['  - Comisiones', {f:'B11'}, '', '', ''],
  ['  - Marketing', {f:'B12'}, '', '', ''],
  ['  - Staff', {f:'B16'}, '', '', ''],
  ['  - Alquiler', {f:'B17'}, '', '', ''],
  ['  - Servicios', {f:'B18'}, '', '', ''],
  ['  - Contador', {f:'B19'}, '', '', ''],
  ['  - Software', {f:'B20'}, '', '', ''],
  ['  - Seguros', {f:'B21'}, '', '', ''],
  ['  - IVA a pagar', {f:'B41'}, '', '', ''],
  ['  - IIBB', {f:'B45'}, '', '', ''],
  ['  - Déb/Créd', {f:'B49'}, '', '', ''],
  ['  Base imponible', {f:'B52+B53+B54+B55+B56+B57+B58+B59+B60+B61+B62+B63+B64'}, '', '', 'CONSULTAR: ¿correcto restar otros imp?'],
  ['  GANANCIAS A PAGAR', {f:'-MAX(0,B65)*Inputs!B21'}, {t:'s',v:'= -MAX(0, Base) × 35%'}, {f:'-B66/B4'}, ''],
  ['', '', '', '', ''],
  ['TOTAL IMPUESTOS', {f:'B41+B45+B49+B66'}, '', {f:'-B68/B4'}, ''],
  ['', '', '', '', ''],
  ['NET INCOME', {f:'B26+B68'}, {t:'s',v:'= EBITDA + Total Impuestos (imp son negativos)'}, {f:'B70/B4'}, ''],
  ['', '', '', '', ''],
  ['', '', '', '', ''],
  ['PREGUNTAS PARA EL CONTADOR', '', '', '', ''],
  ['1. ¿Alquiler comercial genera crédito fiscal IVA o es exento?', '', '', '', ''],
  ['2. ¿IIBB se calcula sobre base neta de IVA para CABA gastronomía?', '', '', '', ''],
  ['3. ¿Sueldos incluyen cargas patronales o sumar ~23%?', '', '', '', ''],
  ['4. ¿Falta algún tributo? (tasas municipales, SUSS, etc.)', '', '', '', ''],
  ['5. ¿Ganancias: correcto restar IVA/IIBB/Déb-Créd de la base?', '', '', '', ''],
];

const wsPnl = XLSX.utils.aoa_to_sheet(pnlData);
wsPnl['!cols'] = [{wch:35},{wch:18},{wch:45},{wch:14},{wch:45}];

// Format currency cells in column B
for (let r = 0; r < pnlData.length; r++) {
  const cell = wsPnl[XLSX.utils.encode_cell({r, c:1})];
  if (cell && (cell.f || typeof cell.v === 'number')) {
    cell.z = '$#,##0';
  }
  // Format % column D
  const cellD = wsPnl[XLSX.utils.encode_cell({r, c:3})];
  if (cellD && cellD.f) {
    cellD.z = '0.0%';
  }
}

XLSX.utils.book_append_sheet(wb, wsInputs, 'Inputs');
XLSX.utils.book_append_sheet(wb, wsPnl, 'Estado de Resultados');

XLSX.writeFile(wb, '/Users/marcoshuergo/Documents/CURSO CLAUDE CODE/gastro-simulator/SNACK-Estado-Resultados-Auditoria.xlsx');
console.log('Excel generado OK');
