import { extractCase } from '../ingest/extract';

const sample = `Case 1: Cement plant entry — India
Industry: Infrastructure Type: Market Entry Difficulty: Medium

Problem: A global cement major is considering entry into India. Should they enter?

Interviewer notes:
- Market size ~380 MT/year
- Top 5 players hold ~50% share
- Govt regulation: 5-year tax holiday for new manufacturers

Ideal structure: Market attractiveness, Client fit, Entry mode, Risks.
Key insights: India growing 8%/year, capacity overhang in some regions.`;

async function main() {
  console.time('extract');
  const r = await extractCase(sample);
  console.timeEnd('extract');
  console.log(JSON.stringify(r, null, 2));
}
main();
