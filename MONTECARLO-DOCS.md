# Documentación del Simulador Monte Carlo Gastronómico

## Qué es y para qué sirve

Herramienta para analizar la viabilidad financiera de un restaurante tipo tapeo/fusión japonesa en Buenos Aires. Tiene dos motores:

1. **Monte Carlo** (aleatorio): corre miles de simulaciones variando parámetros para encontrar combinaciones óptimas
2. **Escenarios determinísticos**: calcula proyecciones fijas de 60 meses para escenarios concretos

---

## Estructura del archivo: `montecarlo.html`

Todo en un solo archivo HTML. Tres bloques:
- **HTML**: layout, tabs, contenedores
- **Worker script** (`<script id="workerCode">`): motor Monte Carlo que corre en threads paralelos
- **Main script** (`<script>`): UI, configuración, escenarios determinísticos, visualización

---

## Las 4 tabs

### Tab 1: Recomendaciones
- **Valores ideales**: mediana del top 25% de escenarios exitosos del Monte Carlo. Separados en "lo que decidís" (capacidad, staff, tickets, alquiler) y "lo que decide el mercado" (vueltas, demanda, ramp-up)
- **Grilla vueltas × demanda**: tabla que cruza vueltas promedio de cena (eje Y) con demanda % (eje X). Muestra payback, net income y cash a 60m. Usa `calcScenario()` con todo fijo al ideal excepto esas dos variables. Los steps se generan dinámicamente desde los rangos configurados.
- **En qué concentrarte**: correlación Spearman entre variables y cash final, filtrado a escenarios cercanos al ideal
- **Sensibilidad de variables fijas**: tablas que mueven una variable a la vez (food cost, sueldos, etc.) con todo lo demás fijo al escenario base

### Tab 2: Escenarios Inversor
- 6 escenarios definidos por **vueltas reales objetivo** (1.0 a 2.0/noche)
- Almuerzo = 40% de cena en cada escenario
- Cada escenario varía: vueltas, demanda, inflación, ramp-up, prob. shock
- Chart de líneas: cash acumulado del inversor mes a mes
- Tabla comparativa con todos los parámetros visibles
- Desglose semanal de vueltas por día

### Tab 3: Riesgos
- Selector de escenario base sobre el cual calcular
- Tablas de "qué pasa si" para: inflación, demanda, ramp-up, alquiler, vueltas cena
- Cada tabla mueve una variable, todo lo demás fijo al escenario elegido

### Tab 4: Monte Carlo
- Datos crudos de la simulación: histogramas, heatmap capacidad×staff, sensibilidad general

---

## Cómo funciona el cálculo

### Proyección de 60 meses

Para cada mes `m` (1 a 60):

1. **Inflación diferenciada**:
   - Alquiler: fijo 24 meses (contrato), después sube con inflación
   - Sueldos: suben cada 6 meses (paritarias) — escalón, no gradual
   - Servicios: suben cada 4 meses (tarifazos)
   - Contador/software: suben anualmente
   - Tickets (ingresos): suben mensual con lag de 1-3 meses (primeros 12m), después lag 1 mes

2. **Demanda del mes**:
   - Ramp-up: lineal de 20% al máximo durante N meses, después estable
   - Estacionalidad mensual: Ene 60%, Feb 65%, Mar 80%, Abr 90%, May 100%, Jun 105%, Jul 110%, Ago 105%, Sep 95%, Oct 90%, Nov 85%, Dic 70%
   - Shocks: en Monte Carlo son aleatorios; en escenarios se aplica un descuento esperado = prob × impacto × duración

3. **Patrón semanal** (cerrado lunes):
   - Cena: Mar 35%, Mié 45%, Jue 75%, Vie 100%, Sáb 100%, Dom 45% → promedio 66.7% del pico
   - Almuerzo: Mar 50%, Mié 60%, Jue 80%, Vie 75%, Sáb 45%, Dom 60% → promedio 61.7% del pico
   - Las "vueltas" configuradas son el PICO (viernes). El promedio real = pico × factor semanal

4. **Revenue**:
   - Covers almuerzo = capacidad × vueltasAlmuerzo(pico) × diasOperativos × demandaEfectiva × factorSemanalAlm
   - Covers cena = capacidad × vueltasCena(pico) × diasOperativos × demandaEfectiva × factorSemanalCena
   - Revenue = covers × ticket × multiplicadorInflaciónTicket

5. **Costos**:
   - COGS: revenue × (foodCost% + paperCost%) — sube automáticamente porque el revenue sube
   - Staff: (fullTime × sueldo + partTimeAlm × sueldo × 0.6) × multiplicadorSueldos
   - Alquiler × multiplicadorAlquiler
   - Servicios × multiplicadorServicios
   - Marketing: revenue × marketingPct%
   - Procesamiento tarjetas: revenueBlanco × 1.5%
   - Contador + software × multiplicadorAnual

6. **Impuestos** (solo sobre la parte blanca):
   - IVA: revenueBlanco × 21% − crédito fiscal (40%)
   - IIBB: revenueBlanco × 3.5%
   - Débitos/Créditos: revenueBlancoConIVA × 1.2%
   - Ganancias: EBITDA × %blanco × 35%

7. **Split inversor/operador**:
   - Pre-payback: inversor cobra 80% de la ganancia neta
   - Post-payback: inversor cobra 27.5% (midpoint del rango 25-30%)

### Staff

Staff se calcula automáticamente desde la capacidad:
- Staff cena = capacidad ÷ ratio (ratio random 2.5-4.0)
- Staff almuerzo = 50% del de cena
- Overlap (doble turno) = 30% del de cena
- Total = cena + almuerzo - overlap
- Part-time almuerzo cobra 60% del sueldo full-time

---

## buildBaseParams: de dónde salen los valores base

Cuando calculás escenarios determinísticos (grilla, escenarios inversor, tablas de riesgo), se usa `buildBaseParams(config)`:

**Del Monte Carlo (idealVals)**: capacidad, vueltasCena, vueltasAlmuerzo, ticketAlmuerzo, ticketCena, alquiler, demandaMaxPct, rampUpMeses, staffCount

**Del config (valores fijos)**: diasOperativos, foodCost, paperCost, costoEmpleado, pctNegro, impuestos

**Del config (punto medio del rango random)**: servicios, inversionTotal, pctPostPayback, marketingPct, inflacionMensual, ajusteTicketLag, probShockMensual, impactoShock, duracionShock, softwareMisc

---

## Problemas conocidos / pendientes de discutir

### 1. Vueltas y demanda en el Monte Carlo
Las vueltas de cena y la demanda las randomiza el MC, pero como dijimos: son variables de mercado, no decisiones. El MC "recomienda" vueltas ideales que no podés controlar. **Pendiente: decidir si sacar vueltas/demanda del MC y dejarlas solo como variables manuales.**

### 2. Los escenarios del inversor no se actualizan con los inputs
Los 6 escenarios (Pesimista a Boom) tienen vueltas reales hardcodeadas (1.0, 1.2, 1.4, base, 1.8, 2.0). No cambian si modificás los rangos de los inputs. **Esto es by design** — son escenarios fijos de referencia.

### 3. Diferencia Monte Carlo vs Escenarios determinísticos
El MC usa shocks aleatorios (un mes puede haber crisis, otro no). Los escenarios determinísticos usan un descuento promedio esperado. El MC va a dar resultados ligeramente peores en promedio que los escenarios determinísticos equivalentes.

### 4. Histogramas con rangos fijos
Los bins de los histogramas están hardcodeados. Si los resultados caen fuera del rango, se acumulan en los extremos. No es un problema funcional pero puede distorsionar la visualización.

### 5. Ramp-up empieza en 20%
Hardcodeado. No configurable. Asume que el mes 1 tenés 20% de ocupación.

### 6. Benchmarks de mercado
Los datos de "lo que decide el mercado" vienen de búsquedas en internet. Benchmarks internacionales dicen 2-3 vueltas pico para casual dining, ~80% ocupación óptima. Argentina 2025 tuvo caída del 30% en consumo gastronómico. **No hay datos específicos de rotación de mesas en CABA.**

---

## Archivos

- `montecarlo.html` — Todo el simulador Monte Carlo
- `index.html` — Simulador determinístico original (con botón "Monte Carlo" que linkea)
- `CALCULOS.md` — Documentación de fórmulas del simulador original
- `MONTECARLO-DOCS.md` — Este archivo
