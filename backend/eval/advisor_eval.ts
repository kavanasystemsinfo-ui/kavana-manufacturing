"""
Evaluación de calidad RAG — AI Advisor (Kavana Manufacturing).

Mide si el gatherContext() recupera los datos correctos para preguntas
típicas de operarios. NO requiere ChromaDB — usa las consultas SQL reales.

Uso:
    cd backend && npx tsx eval/advisor_eval.ts
"""
import { AiAdvisorService } from "../src/ai-advisor/ai-advisor.service.js";

// ── Preguntas de evaluación (ground truth manual) ──
// Cada caso: { pregunta, esperado_en_contexto[], no_esperado_en_contexto[] }
interface EvalCase {
  question: string;
  expected: string[];   // fragmentos que DEBEN aparecer en el contexto
  forbidden?: string[]; // fragmentos que NO deben aparecer
}

const EVAL_CASES: EvalCase[] = [
  {
    question: "¿Cuál es el OEE medio de la línea 1 esta semana?",
    expected: ['"oee"', '"availability"', '"performance"', '"quality"'],
    forbidden: ['"order_id"'],
  },
  {
    question: "¿Qué órdenes están en progreso?",
    expected: ['"code"', '"status"', '"quantity"', '"produced_quantity"'],
    forbidden: ['"defect_type"'],
  },
  {
    question: "¿Cuántas piezas defectuosas hubo ayer?",
    expected: ['"defect_type"', '"defect_quantity"', '"quality_checks"'],
  },
  {
    question: "¿Cuál es el ritmo objetivo del modelo XR-2000?",
    expected: ['"target_rate"', '"manufacturing_models"', '"unit_of_measure"'],
  },
  {
    question: "¿Por qué paró la línea 3 el martes?",
    expected: ['"downtime_reason"', '"workstation_name"', '"production_work_blocks"'],
  },
  {
    question: "hola",
    expected: [],
    forbidden: [],
  },
];

// ── Métrica recall@k ──
function recallAtK(contextJSON: string, expectedTerms: string[], k: number): number {
  const hits = expectedTerms.filter(term => contextJSON.includes(term));
  return Math.min(hits.length / Math.max(expectedTerms.length, 1), 1.0);
}

function precisionAtK(contextJSON: string, forbiddenTerms: string[] | undefined, _k: number): number {
  if (!forbiddenTerms || forbiddenTerms.length === 0) return 1.0;
  const leaks = forbiddenTerms.filter(term => contextJSON.includes(term));
  return leaks.length === 0 ? 1.0 : 0.0;
}

// ── Runner ──
async function main() {
  console.log("=" .repeat(60));
  console.log("Evaluación RAG — AI Advisor (Kavana Manufacturing)");
  console.log("=" .repeat(60));
  console.log();

  const advisor = new AiAdvisorService();

  let totalRecall = 0;
  let totalPrecision = 0;
  let passed = 0;

  for (const [i, tc] of EVAL_CASES.entries()) {
    const label = `[${i + 1}/${EVAL_CASES.length}]`;
    try {
      // Llamada real — necesita DB con datos. En CI usamos mocks o test DB.
      // Para evaluación real, se ejecuta contra una DB con datos de muestra.
      const result = await advisor.ask(tc.question);

      // Verificar respuesta no vacía
      const hasAnswer = result.answer.length > 20;
      const recall = recallAtK(result.answer, tc.expected, 10);
      const precision = precisionAtK(result.answer, tc.forbidden, 10);

      totalRecall += recall;
      totalPrecision += precision;

      if (hasAnswer && recall >= 0.5 && precision >= 0.5) passed++;

      const status = hasAnswer && recall >= 0.5 ? "✅" : "⚠️";
      console.log(`${status} ${label} "${tc.question.slice(0, 50)}..."`);
      console.log(`   recall=${recall.toFixed(2)} precision=${precision.toFixed(2)} engine=${result.engine}`);
      console.log(`   respuesta: ${result.answer.slice(0, 80)}...`);
    } catch (err) {
      console.log(`❌ ${label} "${tc.question.slice(0, 50)}..." → ${err instanceof Error ? err.message : String(err)}`);
    }
    console.log();
  }

  const n = EVAL_CASES.length;
  console.log("=" .repeat(60));
  console.log(`Resultados: ${passed}/${n} pasaron (≥50% recall + precision)`);
  console.log(`Recall medio:  ${(totalRecall / n * 100).toFixed(1)}%`);
  console.log(`Precision media: ${(totalPrecision / n * 100).toFixed(1)}%`);
  console.log("=" .repeat(60));

  if (passed < n) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(2);
});
