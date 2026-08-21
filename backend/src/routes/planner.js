// Task 16: Smart Planner - greedy heuristic (see TASKS.md for why this is
// NOT a full TOPTW solver - that's an explicit, deliberate scope decision).
// Ranks tours by interest-match-per-price, greedily fills the budget while
// respecting the day count. Explainable: every pick has a visible reason.
 
import { Router } from 'express';
import { db } from '../db/index.js';
 
const router = Router();
 
function computeMatchScore(tour, interests) {
  if (!tour.interest_score) return 0.25; // no data - treat as neutral/unknown
  let scores;
  try {
    scores = JSON.parse(tour.interest_score);
  } catch {
    return 0.25;
  }
  if (!interests || interests.length === 0) {
    const values = Object.values(scores);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  const matched = interests.map((i) => scores[i] ?? 0);
  return matched.reduce((a, b) => a + b, 0) / matched.length;
}
 
router.post('/', (req, res) => {
  const { budget, days, interests } = req.body;
 
  if (!budget || !days) {
    return res.status(400).json({ error: 'budget and days are required' });
  }
 
  const tours = db.prepare('SELECT * FROM tours').all();
 
  const scored = tours.map((tour) => {
    const matchScore = computeMatchScore(tour, interests);
    // Explainable ranking metric: interest-match per AZN spent.
    const valuePerPrice = matchScore / tour.price;
    return { ...tour, match_score: Math.round(matchScore * 100) / 100, value_per_price: valuePerPrice };
  });
 
  // Greedy: highest value-per-price first, take while budget and days allow.
  scored.sort((a, b) => b.value_per_price - a.value_per_price);
 
  const selected = [];
  let remainingBudget = budget;
  let remainingDays = days;
 
  for (const tour of scored) {
    if (tour.price <= remainingBudget && tour.duration_days <= remainingDays) {
      selected.push(tour);
      remainingBudget -= tour.price;
      remainingDays -= tour.duration_days;
    }
    if (remainingDays <= 0) break;
  }
 
  const totalPrice = selected.reduce((sum, t) => sum + t.price, 0);
  const totalDays = selected.reduce((sum, t) => sum + t.duration_days, 0);
 
  res.json({
    budget,
    days,
    interests: interests ?? [],
    selected_tours: selected.map((t) => ({
      id: t.id,
      title: t.title,
      price: t.price,
      duration_days: t.duration_days,
      match_score: t.match_score,
      reason: `interest match ${t.match_score} per AZN${t.price}`,
    })),
    total_price: totalPrice,
    total_days: totalDays,
    remaining_budget: Math.round(remainingBudget * 100) / 100,
  });
});
 
export default router;
