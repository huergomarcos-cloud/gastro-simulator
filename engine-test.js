// ═══════════════════════════════════════════════════════════
// SNACK SIMULATOR v2 — ENGINE (pure functions, no DOM)
// ═══════════════════════════════════════════════════════════

const DAYS_OP = 26;
const MONTHS = 60;
const DAY_NAMES = ['Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Estacionalidad Buenos Aires
const SEASONAL = [0.55, 0.60, 0.90, 0.90, 0.90, 0.95, 0.95, 0.95, 0.95, 0.95, 1.00, 1.05];

// ─────────────────────────────────────────────────────────
// calcScenario(p) → { months[], summary }
// ─────────────────────────────────────────────────────────
function calcScenario(p) {
  const {
    cap,
    rotCenaDay,     // [6] rotaciones cena por día Mar-Dom
    rotAlmDay,      // [6] rotaciones almuerzo por día Mar-Dom
    ticketCena,
    ticketAlm,
    foodCost,       // 0.25
    paperCost,      // 0.025
    comisionPago,   // 0.012
    mktRampup,      // 0.05
    mktDespues,     // 0.03
    staffCena,
    staffAlm,
    sueldo,
    alquiler,
    servicios,
    contador,
    software,
    seguros,
    demandaMax,     // 0.90
    rampupMeses,    // 9
    mesApertura,    // 1-12 (1=enero)
    pctNegro,       // 0.20
    pctComprasBlanco, // 0.80
    inversion,
    ivaRate,        // 0.21
    iibbRate,       // 0.035
    debCredRate,    // 0.012
    gananciasRate,  // 0.35
    splitPreInv,    // 0.80
    splitPostInv,   // 0.25
    // Optional: scale rotations for scenarios (multiplicador)
    rotScale,
  } = p;

  const pctBlanco = 1 - pctNegro;
  const scale = rotScale ?? 1;
  const rCena = rotCenaDay.map(r => r * scale);
  const rAlm = rotAlmDay.map(r => r * scale);
  const rotCenaAvg = rCena.reduce((a, b) => a + b, 0) / rCena.length;
  const rotAlmAvg = rAlm.reduce((a, b) => a + b, 0) / rAlm.length;
  const staffTotal = staffCena + staffAlm;
  const costoStaffMes = staffTotal * sueldo;
  const costosFijosMes = costoStaffMes + alquiler + servicios + contador + software + seguros;

  const months = [];
  let cashAcum = -inversion;
  let cashInversor = -inversion;
  let cashOperador = 0;
  let paybackMonth = null;

  for (let m = 0; m < MONTHS; m++) {
    // ── Demanda del mes ──
    let demandaMes;
    if (m < rampupMeses) {
      // Ramp-up: lineal 30% → demandaMax, SIN estacionalidad
      demandaMes = 0.30 + (demandaMax - 0.30) * (m / rampupMeses);
    } else {
      // Post ramp-up: demandaMax × estacionalidad
      const calendarMonth = (mesApertura - 1 + m) % 12;
      demandaMes = demandaMax * SEASONAL[calendarMonth];
    }
    demandaMes = Math.max(0, Math.min(1, demandaMes));

    // Mes calendario (para labels)
    const calendarMonth = (mesApertura - 1 + m) % 12;

    // ── Covers ──
    const coversCena = cap * rotCenaAvg * DAYS_OP * demandaMes;
    const coversAlm = cap * rotAlmAvg * DAYS_OP * demandaMes;
    const coversTotal = coversCena + coversAlm;

    // ── Revenue ──
    const revenueCena = coversCena * ticketCena;
    const revenueAlm = coversAlm * ticketAlm;
    const revenue = revenueCena + revenueAlm;
    const revenueBlanco = revenue * pctBlanco;
    const revenueNegro = revenue * pctNegro;

    // ── Costos variables ──
    const costoFood = revenue * foodCost;
    const costoPaper = revenue * paperCost;
    const costoComision = revenueBlanco * comisionPago;
    const mktRate = m < rampupMeses ? mktRampup : mktDespues;
    const costoMkt = revenue * mktRate;
    const totalCostosVar = costoFood + costoPaper + costoComision + costoMkt;

    // ── Costos fijos ── (constantes, sin inflación)
    const totalCostosFijos = costosFijosMes;

    // ── EBITDA ──
    const totalCostos = totalCostosVar + totalCostosFijos;
    const ebitda = revenue - totalCostos;

    // ── Impuestos (sobre blanco) ──

    // IVA: débito - crédito real
    const ivaDebito = revenueBlanco * ivaRate / (1 + ivaRate);
    const comprasConCredito = (costoFood + costoPaper) * pctComprasBlanco + servicios + contador + software + seguros;
    const ivaCredito = comprasConCredito * ivaRate / (1 + ivaRate);
    const ivaAPagar = Math.max(0, ivaDebito - ivaCredito);

    // IIBB: sobre revenue neto de IVA
    const iibb = revenueBlanco / (1 + ivaRate) * iibbRate;

    // Déb/Créd bancarios
    const debCred = revenueBlanco * debCredRate;

    // Ganancias: sobre ganancia neta
    const costosDeducibles =
      (costoFood + costoPaper) * pctComprasBlanco +
      costoComision + costoMkt +
      costoStaffMes + alquiler + servicios + contador + software + seguros;
    const baseGanancias = revenueBlanco - costosDeducibles - ivaAPagar - iibb - debCred;
    const ganancias = Math.max(0, baseGanancias) * gananciasRate;

    const totalImpuestos = ivaAPagar + iibb + debCred + ganancias;

    // ── Net Income ──
    const netIncome = ebitda - totalImpuestos;

    // ── Cash flow ──
    cashAcum += netIncome;

    // ── Split socios ──
    const prePB = cashInversor < 0;
    const splitInv = prePB ? splitPreInv : splitPostInv;
    cashInversor += netIncome * splitInv;
    cashOperador += netIncome * (1 - splitInv);

    if (paybackMonth === null && cashInversor >= 0) {
      paybackMonth = m + 1;
    }

    months.push({
      month: m + 1,
      calendarMonth,
      demandaMes,
      coversCena, coversAlm, coversTotal,
      revenueCena, revenueAlm, revenue,
      revenueBlanco, revenueNegro,
      costoFood, costoPaper, costoComision, costoMkt,
      totalCostosVar,
      costoStaff: costoStaffMes, costoAlquiler: alquiler, costoServicios: servicios,
      costoContador: contador, costoSoftware: software, costoSeguros: seguros,
      totalCostosFijos,
      totalCostos,
      ebitda,
      ivaAPagar, iibb, debCred, ganancias,
      totalImpuestos,
      netIncome,
      cashAcum,
      cashInversor, cashOperador,
    });
  }

  // ── Summary (steady state = last 12 months average) ──
  const last12 = months.slice(-12);
  const avgRevenue = last12.reduce((s, m) => s + m.revenue, 0) / 12;
  const avgEbitda = last12.reduce((s, m) => s + m.ebitda, 0) / 12;
  const avgNetIncome = last12.reduce((s, m) => s + m.netIncome, 0) / 12;

  // Net blanco/negro split
  const avgNetNegro = last12.reduce((s, m) => s + m.ebitda * pctNegro, 0) / 12;
  const avgNetBlanco = avgNetIncome - avgNetNegro;

  // ROI year 1
  const year1Net = months.slice(0, 12).reduce((s, m) => s + m.netIncome, 0);
  const roi1 = year1Net / inversion;

  // Cash at 60m
  const cash60 = months[MONTHS - 1].cashAcum;

  // Piso de caja (working capital)
  const minCash = Math.min(...months.map(m => m.cashAcum));
  const minCashMonth = months.find(m => m.cashAcum === minCash);

  // Unit economics (steady state)
  const ssCovers = last12.reduce((s, m) => s + m.coversTotal, 0) / 12;
  const ticketPonderado = ssCovers > 0 ? avgRevenue / ssCovers : 0;
  const costoVarPorCubierto = ssCovers > 0 ? last12.reduce((s, m) => s + m.totalCostosVar, 0) / 12 / ssCovers : 0;
  const margenPorCubierto = ticketPonderado - costoVarPorCubierto;

  // Ratios gastro (steady state)
  const laborPct = avgRevenue > 0 ? costoStaffMes / avgRevenue : 0;
  const primeCost = avgRevenue > 0 ? (last12.reduce((s, m) => s + m.costoFood, 0) / 12 + costoStaffMes) / avgRevenue : 0;
  const alquilerPct = avgRevenue > 0 ? alquiler / avgRevenue : 0;

  // Break-even: covers/día para net income = 0 en steady state
  // revenue_be - costosVar(revenue_be) - costosFijos - impuestos(revenue_be) ≈ 0
  // Simplificación: busco por iteración
  let beCoversDay = 0;
  for (let c = 1; c < 500; c++) {
    const testRev = c * ticketPonderado;
    const testVarCosts = testRev * (foodCost + paperCost + comisionPago * pctBlanco + mktDespues);
    const testContrib = testRev - testVarCosts;
    const testFixedDaily = costosFijosMes / DAYS_OP;
    if (testContrib >= testFixedDaily) {
      beCoversDay = c;
      break;
    }
  }

  // Daily target
  const dailyTargetRevenue = costosFijosMes / DAYS_OP + costosFijosMes / DAYS_OP * 0.3; // fijos + ~30% for taxes/var
  const dailyTargetCovers = ticketPonderado > 0 ? Math.ceil(dailyTargetRevenue / ticketPonderado) : 0;

  return {
    months,
    paybackMonth: paybackMonth ?? '>60',
    avgRevenue, avgEbitda, avgNetIncome,
    avgNetBlanco, avgNetNegro,
    roi1, cash60,
    minCash, minCashMonth: minCashMonth ? minCashMonth.month : 1,
    inversion,
    staffTotal, costoStaffMes, costosFijosMes,
    // Unit economics
    ticketPonderado, costoVarPorCubierto, margenPorCubierto,
    // Ratios
    primeCost, laborPct, alquilerPct,
    // Break-even
    beCoversDay,
    dailyTargetRevenue: Math.round(dailyTargetRevenue),
    dailyTargetCovers,
    // Rotations used
    rotCenaAvg, rotAlmAvg,
    params: p,
  };
}

// ─────────────────────────────────────────────────────────
// calcDaily(p) → grilla día × servicio para vista Operación
// ─────────────────────────────────────────────────────────
function calcDaily(p, demandaOverride) {
  const {
    cap, rotCenaDay, rotAlmDay, ticketCena, ticketAlm,
    foodCost, paperCost, comisionPago, pctNegro,
    staffCena, staffAlm, sueldo,
    mktDespues,
  } = p;

  const pctBlanco = 1 - pctNegro;
  const demanda = demandaOverride ?? p.demandaMax;
  const laborCenaDay = staffCena * sueldo / DAYS_OP;
  const laborAlmDay = staffAlm * sueldo / DAYS_OP;
  const varRate = foodCost + paperCost + comisionPago * pctBlanco + mktDespues;

  const days = DAY_NAMES.map((name, i) => {
    const coversCena = cap * rotCenaDay[i] * demanda;
    const coversAlm = cap * rotAlmDay[i] * demanda;
    const revCena = coversCena * ticketCena;
    const revAlm = coversAlm * ticketAlm;
    const varCena = revCena * varRate;
    const varAlm = revAlm * varRate;
    const contribCena = revCena - varCena - laborCenaDay;
    const contribAlm = revAlm - varAlm - laborAlmDay;

    return {
      name,
      coversCena: Math.round(coversCena),
      coversAlm: Math.round(coversAlm),
      revCena: Math.round(revCena),
      revAlm: Math.round(revAlm),
      laborCena: Math.round(laborCenaDay),
      laborAlm: Math.round(laborAlmDay),
      contribCena: Math.round(contribCena),
      contribAlm: Math.round(contribAlm),
    };
  });

  return days;
}


// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

const defaults = {
  cap: 30,
  rotCenaDay: [0.8, 1.0, 1.8, 2.8, 2.5, 2.0],
  rotAlmDay: [0.4, 0.5, 0.9, 1.4, 1.3, 1.0],
  ticketCena: 38, ticketAlm: 22,
  foodCost: 0.25, paperCost: 0.025, comisionPago: 0.012,
  mktRampup: 0.05, mktDespues: 0.03,
  staffCena: 9, staffAlm: 5, sueldo: 1150,
  alquiler: 3400, servicios: 1350,
  contador: 500, software: 300, seguros: 300,
  demandaMax: 0.90, rampupMeses: 9, mesApertura: 3,
  pctNegro: 0.20, pctComprasBlanco: 0.80,
  inversion: 225000,
  ivaRate: 0.21, iibbRate: 0.035, debCredRate: 0.012, gananciasRate: 0.35,
  splitPreInv: 0.80, splitPostInv: 0.25,
};

console.log('=== TEST 1: Base scenario ===');
const r = calcScenario(defaults);
console.log('Staff:', r.staffTotal, '| Staff cost:', r.costoStaffMes);
console.log('Costos fijos/mes:', r.costosFijosMes);
console.log('AvgRevenue:', Math.round(r.avgRevenue));
console.log('AvgEBITDA:', Math.round(r.avgEbitda));
console.log('AvgNetIncome:', Math.round(r.avgNetIncome));
console.log('AvgNetBlanco:', Math.round(r.avgNetBlanco));
console.log('AvgNetNegro:', Math.round(r.avgNetNegro));
console.log('Payback:', r.paybackMonth);
console.log('ROI Y1:', (r.roi1 * 100).toFixed(1) + '%');
console.log('Cash60:', Math.round(r.cash60));
console.log('MinCash:', Math.round(r.minCash), 'at month', r.minCashMonth);
console.log('Ratios: Prime', (r.primeCost*100).toFixed(1) + '%', '| Labor', (r.laborPct*100).toFixed(1) + '%', '| Alq', (r.alquilerPct*100).toFixed(1) + '%');
console.log('Unit: TicketPond', r.ticketPonderado.toFixed(1), '| CostoVar/cub', r.costoVarPorCubierto.toFixed(1), '| Margen/cub', r.margenPorCubierto.toFixed(1));
console.log('BE covers/day:', r.beCoversDay);

// Verify steady state is constant
console.log('\n=== TEST 2: Steady state constancy ===');
const m12 = r.months[11];
const m24 = r.months[23];
const m60 = r.months[59];
console.log('M12 net:', Math.round(m12.netIncome), '| M24 net:', Math.round(m24.netIncome), '| M60 net:', Math.round(m60.netIncome));
console.log('M12 staff:', Math.round(m12.costoStaff), '| M60 staff:', Math.round(m60.costoStaff));
console.log('M12 revenue:', Math.round(m12.revenue), '| M60 revenue:', Math.round(m60.revenue));

// Check ramp-up vs post ramp-up
console.log('\n=== TEST 3: Ramp-up behavior ===');
console.log('M1 demand:', r.months[0].demandaMes.toFixed(3), '| M5 demand:', r.months[4].demandaMes.toFixed(3), '| M9 demand:', r.months[8].demandaMes.toFixed(3), '| M10 demand:', r.months[9].demandaMes.toFixed(3));
console.log('M1 (mar) seasonal should NOT apply:', r.months[0].demandaMes.toFixed(3), '= 0.300');
console.log('M10 (dec, post ramp) should be 90%*105%:', r.months[9].demandaMes.toFixed(3), '= 0.945');

// Verify impuestos
console.log('\n=== TEST 4: Impuestos check (M60) ===');
console.log('IVA a pagar:', Math.round(m60.ivaAPagar));
console.log('IIBB:', Math.round(m60.iibb));
console.log('Deb/Cred:', Math.round(m60.debCred));
console.log('Ganancias:', Math.round(m60.ganancias));
console.log('Total imp:', Math.round(m60.totalImpuestos));
console.log('EBITDA:', Math.round(m60.ebitda), '- Imp:', Math.round(m60.totalImpuestos), '= Net:', Math.round(m60.netIncome));

// Test daily
console.log('\n=== TEST 5: Daily breakdown ===');
const daily = calcDaily(defaults);
console.log('Day | Cena Rev | Cena Lab | Cena P/L | Alm Rev | Alm Lab | Alm P/L');
daily.forEach(d => {
  const cColor = d.contribCena < 0 ? '❌' : '✅';
  const aColor = d.contribAlm < 0 ? '❌' : '✅';
  console.log(`${d.name} | $${d.revCena} | $${d.laborCena} | ${cColor} $${d.contribCena} | $${d.revAlm} | $${d.laborAlm} | ${aColor} $${d.contribAlm}`);
});

// Test daily with January (55%)
console.log('\n=== TEST 6: Daily in January (55% demand) ===');
const dailyJan = calcDaily(defaults, defaults.demandaMax * 0.55);
dailyJan.forEach(d => {
  const cColor = d.contribCena < 0 ? '❌' : '✅';
  const aColor = d.contribAlm < 0 ? '❌' : '✅';
  console.log(`${d.name} | Cena ${cColor} $${d.contribCena} | Alm ${aColor} $${d.contribAlm}`);
});
