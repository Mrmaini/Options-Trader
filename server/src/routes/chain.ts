import { Router, Request, Response, NextFunction } from 'express';
import { getOptionsChain } from '../services/yahooFinanceService';
import { chainLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/:symbol', chainLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;
    const { expiration } = req.query;

    if (!symbol || !/^[\w^.]+$/i.test(symbol)) {
      res.status(400).json({ error: 'Invalid symbol' });
      return;
    }

    const data = await getOptionsChain(symbol, expiration as string | undefined);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
