import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import casesRoutes from './routes/cases.routes';
import aiRoutes from './routes/ai.routes';
import exportRoutes from './routes/export.routes';
import connectionsRoutes from './routes/connections.routes';
import schemaRoutes from './routes/schema.routes';
import queryRoutes from './routes/query.routes';
import historyRoutes from './routes/history.routes';
import { sendError } from './utils/response';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Connexa API',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/history', historyRoutes);

app.use((_req: Request, res: Response) => {
  sendError(res, 'Route not found', 404);
});

interface HttpError extends Error {
  status?: number;
}

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  sendError(res, err.message || 'Internal server error', err.status || 500);
});

app.listen(PORT, () => {
  console.log(`Connexa API running on port ${PORT}`);
});

export default app;
