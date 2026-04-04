import { Router, Request, Response, NextFunction } from 'express';
import { getMarketContext, getHistoricalData, getIntradayData } from '../services/yahooFinanceService';
import { quotesLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/context', quotesLimiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getMarketContext();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/historical/:symbol', quotesLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;
    const { period } = req.query;
    if (!symbol || !/^[\w^.]+$/i.test(symbol)) { res.status(400).json({ error: 'Invalid symbol' }); return; }
    const validPeriods = ['1mo', '3mo', '6mo', '1y'];
    const p = validPeriods.includes(period as string) ? (period as '1mo' | '3mo' | '6mo' | '1y') : '3mo';
    const data = await getHistoricalData(symbol, p);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/intraday/:symbol', quotesLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;
    const { interval } = req.query;
    if (!symbol || !/^[\w^.]+$/i.test(symbol)) { res.status(400).json({ error: 'Invalid symbol' }); return; }
    const validIntervals = ['5m', '15m', '1h'];
    const iv = validIntervals.includes(interval as string) ? (interval as '5m' | '15m' | '1h') : '5m';
    const data = await getIntradayData(symbol, iv);
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
