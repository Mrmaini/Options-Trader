import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import quotesRouter from './routes/quotes';
import chainRouter from './routes/chain';
import marketRouter from './routes/market';
import earningsRouter from './routes/earnings';
import flowRouter from './routes/flow';
import scannerRouter from './routes/scanner';
import { errorHandler, notFound } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/quotes', quotesRouter);
app.use('/api/chain', chainRouter);
app.use('/api/market', marketRouter);
app.use('/api/earnings', earningsRouter);
app.use('/api/flow', flowRouter);
app.use('/api/scanner', scannerRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Options Trader API running on http://localhost:${PORT}`);
});

export default app;
