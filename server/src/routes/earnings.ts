import { Router, Request, Response, NextFunction } from 'express';
import { getEarnings } from '../services/yahooFinanceService';
import { quotesLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/:symbol', quotesLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;
    if (!symbol || !/^[\w^.]+$/i.test(symbol)) {
      res.status(400).json({ error: 'Invalid symbol' });
      return;
    }
    const data = await getEarnings(symbol);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
