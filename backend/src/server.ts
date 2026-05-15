import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

const isTest = process.env.NODE_ENV === 'test';
dotenv.config({ path: '../.env' });
if (isTest) process.env.NODE_ENV = 'test';

import rateLimit from 'express-rate-limit';

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';


import { connectDB } from './config/database';
import passport from './config/oauth';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import integrationRoutes from './routes/integration.routes';
import searchRoutes from './routes/search.routes';
import slackRoutes from './routes/slack.routes';
import jiraRoutes from './routes/jira.routes';
import confluenceRoutes from './routes/confluence.routes';
import oauthRoutes from './routes/oauth.routes';
import vectorRoutes from './routes/vector.routes';
import { startIntegrationScheduler } from './services/integration-scheduler';


const app = express();

const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'rbhu-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());


// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Swagger Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'rbhu API', version: '1.0.0' },
  },
  apis: ['./src/routes/*.ts'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/confluence', confluenceRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/vector', vectorRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'rbhu', timestamp: new Date() });
});



// Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error' 
  });
});



// Start Server
const startServer = async () => {
  if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_SERVER_START !== 'true') {
    await connectDB();
    startIntegrationScheduler();

    app.listen(PORT, () => {
      console.log(`🧭 rbhu server running on port ${PORT}`);
      console.log(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
    });
  }
};

startServer();

export default app;
