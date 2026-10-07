// GET /api/weather - forecast for the homepage's "Weather in Azerbaijan"
// panel (see lib/stormglass.js). Answers { configured: false } without a
// STORMGLASS_API_KEY, so the frontend hides the panel instead of showing
// made-up weather.
import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { stormglassConfigured, weatherOverview } from '../lib/stormglass.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  if (!stormglassConfigured()) return res.json({ configured: false, cities: [] });
  const overview = await weatherOverview();
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ configured: true, ...overview });
}));

export default router;
