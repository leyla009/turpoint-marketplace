// GET /api/weather - forecast for the homepage's "Weather in Azerbaijan"
// panel (see lib/stormglass.js). Answers { configured: false } without a
// STORMGLASS_API_KEY, so the frontend hides the panel instead of showing
// made-up weather.
import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { stormglassConfigured, weatherOverview, weatherForCity } from '../lib/stormglass.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  if (!stormglassConfigured()) return res.json({ configured: false, cities: [] });
  const overview = await weatherOverview();
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ configured: true, ...overview });
}));

// GET /api/weather/:id - one city, fetched on demand the first time a
// traveler opens its chip (then cached like the rest).
router.get('/:id', asyncHandler(async (req, res) => {
  if (!stormglassConfigured()) return res.status(404).json({ error: 'weather not configured' });
  try {
    const city = await weatherForCity(req.params.id);
    if (!city) return res.status(404).json({ error: 'unknown city' });
    res.set('Cache-Control', 'public, max-age=300');
    res.json(city);
  } catch {
    res.status(503).json({ error: 'forecast unavailable' });
  }
}));

export default router;
