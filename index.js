import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDB } from './db.js';
import authRoutes from './authRoutes.js';
import researchRoutes from './researchRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Rate limiting
app.use('/api/research/stream', rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many research requests. Please wait a minute.' },
}));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/research', researchRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Boot
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 LLM: Anthropic Claude (via LangChain.js)`);
      console.log(`🗄️  Database: MySQL`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
