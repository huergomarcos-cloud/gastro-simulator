# Modelo de Cálculo — Simulador Gastronómico

## 1. COVERS (Capacidad)

| Concepto | Fórmula |
|---|---|
| Covers diarios máx | `capacidad × (vueltasAlmuerzo + vueltasCena)` |
| Covers mensuales máx | `coversDiarios × diasOperativos` |
| Covers efectivos (steady state) | `coversMensuales × demandaMaxima(90%)` |

---

## 2. REVENUE

| Concepto | Fórmula |
|---|---|
| Revenue Total mensual | `coversEfectivos × ticketPromedio` |
| Revenue en negro | `revenueTotal × (pctNegro / 100)` |
| Revenue en blanco | `revenueTotal × (pctBlanco / 100)` |

> `pctBlanco = 100 - pctNegro` (siempre suman 100%)

---

## 3. COGS (Costo de mercadería)

| Concepto | Fórmula |
|---|---|
| Food Cost | `revenueTotal × (foodCost% / 100)` |
| Paper Cost | `revenueTotal × (paperCost% / 100)` |
| **Total COGS** | `foodCost + paperCost` |
| **Utilidad Bruta** | `revenueTotal - totalCOGS` |
| Margen Bruto | `utilidadBruta / revenueTotal × 100` |

---

## 4. GASTOS OPERATIVOS

### 4a. Staff
| Concepto | Fórmula |
|---|---|
| Staff total | `staffCount × costoEmpleado` |

### 4b. SG&A (variables sobre revenue)
| Concepto | Fórmula |
|---|---|
| OPEX / Mantenimiento | `revenueTotal × 2%` |
| Marketing | `revenueTotal × 3%` |
| Processing / bancarios | `revenueBlanco × 2.5%` (solo sobre facturación en blanco) |

### 4c. SG&A (fijos)
| Concepto | Fórmula |
|---|---|
| Estudio contable | `$500 / mes` |
| Software / seguros / misc | `$300 / mes` |
| **Total SG&A fijo** | `$800 / mes` |

### 4d. Total
| Concepto | Fórmula |
|---|---|
| **Total Gastos Operativos** | `staff + alquiler + servicios + opex + marketing + processing + sgaFijo` |

---

## 5. EBITDA

| Concepto | Fórmula |
|---|---|
| **EBITDA** | `utilidadBruta - totalGastosOperativos` |
| Margen EBITDA | `ebitda / revenueTotal × 100` |

---

## 6. IMPUESTOS Y RESULTADO NETO

| Concepto | Fórmula |
|---|---|
| Impuestos | `max(0, ebitda × pctBlanco% × 35%)` |
| **Resultado Neto** | `ebitda - impuestos` |
| Margen Neto | `resultadoNeto / revenueTotal × 100` |

> Lógica: solo se paga impuesto (35%) sobre la proporción del EBITDA que corresponde a facturación en blanco. Si EBITDA es negativo, impuestos = 0.

---

## 7. PROYECCIÓN 24 MESES (Ramp-up)

Para cada mes `m` de 1 a 24:

| Concepto | Fórmula |
|---|---|
| % ocupación mes m | Si `m <= rampUpMeses`: `20% + (90% - 20%) × (m / rampUpMeses)` — Si `m > rampUpMeses`: `90%` |
| Covers mes m | `coversMensuales × ocupacion%` |
| Revenue mes m | `coversM × ticketPromedio` |
| COGS mes m | `revenueM × (foodCost% + paperCost%)` |
| Utilidad bruta m | `revenueM - cogsM` |
| OPEX mes m | `staff + alquiler + servicios + revenueM×(2%+3%) + revBlancoM×2.5% + $800` |
| EBITDA mes m | `utilidadBrutaM - opexM` |
| Impuestos mes m | `max(0, ebitdaM × pctBlanco% × 35%)` |
| Neto mes m | `ebitdaM - impuestosM` |
| **Caja acumulada** | Arranca en `-inversionTotal`, suma `netoM` cada mes |

> Ramp-up: lineal de 20% a 90% en N meses. Después se mantiene en 90%.

---

## 8. PAYBACK

| Concepto | Fórmula |
|---|---|
| Payback del proyecto | Primer mes donde `cajaAcumulada >= 0` |

---

## 9. BREAK-EVEN

| Concepto | Fórmula |
|---|---|
| Costos fijos | `staff + alquiler + servicios + sgaFijo ($800)` |
| Contribución por cover | `ticket × (1 - foodCost% - paperCost% - opex2% - mkt3%) - ticket × pctBlanco% × processing2.5%` |
| Covers break-even | `costosFijos / contribucionPorCover` |
| Ocupación break-even | `coversBreakEven / coversMensuales × 100` |

---

## 10. SPLIT INVERSOR / OPERADOR

Para cada mes `m`:

| Concepto | Fórmula |
|---|---|
| ¿Pre-payback? | `acumuladoInversor < inversionTotal` |
| % split | Si pre-payback: `pctDurantePayback%` — Si post: `pctPostPayback%` |
| Share inversor | Si `netoM > 0`: `netoM × split%` — Si no: `0` |
| Share operador | `netoM - shareInversor` |
| Acumulado inversor | Suma de shares inversor hasta mes m |
| Acumulado operador | Suma de shares operador hasta mes m |

> El inversor recibe un % mayor hasta recuperar su inversión, después baja a un % menor.

---

## 11. ROI AÑO 1

| Concepto | Fórmula |
|---|---|
| Neto anual | Suma de neto meses 1 a 12 |
| ROI | `netoAnual / inversionTotal × 100` |

---

## 12. SENSIBILIDAD (Tornado)

Para cada variable clave, se calcula:
- Neto con variable +20%
- Neto con variable -20%
- Impacto = diferencia vs. neto base

Se ordenan por mayor impacto absoluto.

---

## 13. ESCENARIOS

| Escenario | Modificadores |
|---|---|
| Pesimista | ticket ×0.8, foodCost ×1.15, vueltas ×0.8 |
| Base | sin cambios |
| Optimista | ticket ×1.15, foodCost ×0.9, vueltas ×1.2 |
