import { Router, Request, Response, NextFunction } from 'express';
import { getOptionsChain } from '../services/yahooFinanceService';
import { chainLimiter } from '../middleware/rateLimit';

const router = Router();

// Options flow: analyze chain for unusual activity
router.get('/:symbol', chainLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.params;
    if (!symbol || !/^[\w^.]+$/i.test(symbol)) { res.status(400).json({ error: 'Invalid symbol' }); return; }

    const chain = await getOptionsChain(symbol);
    const all = [...chain.calls, ...chain.puts];

    // Score each contract for unusual activity
    const flows = all
      .filter((c) => c.volume > 0 && c.openInterest > 0)
      .map((c) => {
        const volOiRatio = c.openInterest > 0 ? c.volume / c.openInterest : 0;
        const dollarFlow = c.volume * c.mid * 100;
        const spreadPct = c.mid > 0 ? ((c.ask - c.bid) / c.mid) * 100 : 100;
        const unusual = volOiRatio > 0.5 && c.volume > 100;
        const bullish = c.type === 'call';
        return {
          contractSymbol: c.contractSymbol,
          type: c.type,
          strike: c.strike,
          expiration: c.expiration,
          bid: c.bid,
          ask: c.ask,
          mid: c.mid,
          volume: c.volume,
          openInterest: c.openInterest,
          impliedVolatility: c.impliedVolatility,
          volOiRatio: parseFloat(volOiRatio.toFixed(2)),
          dollarFlow: Math.round(dollarFlow),
          spreadPct: parseFloat(spreadPct.toFixed(1)),
          unusual,
          sentiment: bullish ? 'bullish' : 'bearish',
        };
      })
      .sort((a, b) => b.dollarFlow - a.dollarFlow)
      .slice(0, 50);

    const totalCallFlow = flows.filter(f => f.type === 'call').reduce((s, f) => s + f.dollarFlow, 0);
    const totalPutFlow = flows.filter(f => f.type === 'put').reduce((s, f) => s + f.dollarFlow, 0);
    const putCallRatio = totalCallFlow > 0 ? totalPutFlow / totalCallFlow : 1;

    res.json({
      symbol: symbol.toUpperCase(),
      underlyingPrice: chain.underlyingPrice,
      totalCallFlow,
      totalPutFlow,
      putCallRatio: parseFloat(putCallRatio.toFixed(2)),
      flowSentiment: putCallRatio < 0.7 ? 'bullish' : putCallRatio > 1.3 ? 'bearish' : 'neutral',
      flows,
    });
  } catch (err) { next(err); }
});

export default router;
