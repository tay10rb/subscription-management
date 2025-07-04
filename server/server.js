const express = require('express');
const cors = require('cors');
const path = require('path');
const ExchangeRateScheduler = require('./services/exchangeRateScheduler');

// Load environment variables from root .env file (unified configuration)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import modules
const { initializeDatabase } = require('./config/database');
const { apiKeyAuth } = require('./middleware/auth');
const { createSubscriptionRoutes, createProtectedSubscriptionRoutes } = require('./routes/subscriptions');
const { createSubscriptionManagementRoutes } = require('./routes/subscriptionManagement');
const { createAnalyticsRoutes } = require('./routes/analytics');
const { createSettingsRoutes, createProtectedSettingsRoutes } = require('./routes/settings');
const { createExchangeRateRoutes, createProtectedExchangeRateRoutes } = require('./routes/exchangeRates');
const { createPaymentHistoryRoutes, createProtectedPaymentHistoryRoutes } = require('./routes/paymentHistory');
const { createMonthlyExpensesRoutes, createProtectedMonthlyExpensesRoutes } = require('./routes/monthlyExpenses');
const { createCategoriesRoutes, createProtectedCategoriesRoutes, createPaymentMethodsRoutes, createProtectedPaymentMethodsRoutes } = require('./routes/categoriesAndPaymentMethods');

const app = express();
const port = process.env.PORT || 3001; // Use PORT from environment or default to 3001

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = initializeDatabase();

// Initialize exchange rate scheduler
const exchangeRateScheduler = new ExchangeRateScheduler(db, process.env.TIANAPI_KEY);
exchangeRateScheduler.start();

// Serve static files from the public directory (frontend build)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Subscription Management Backend is running!', status: 'healthy' });
});

// --- API Routers ---
const apiRouter = express.Router();
const protectedApiRouter = express.Router();

// Apply auth middleware to the protected router
protectedApiRouter.use(apiKeyAuth);

// Register route modules
apiRouter.use('/subscriptions', createSubscriptionRoutes(db));
protectedApiRouter.use('/subscriptions', createProtectedSubscriptionRoutes(db));
protectedApiRouter.use('/subscriptions', createSubscriptionManagementRoutes(db));

apiRouter.use('/analytics', createAnalyticsRoutes(db));

apiRouter.use('/settings', createSettingsRoutes(db));
protectedApiRouter.use('/settings', createProtectedSettingsRoutes(db));

apiRouter.use('/exchange-rates', createExchangeRateRoutes(db));
protectedApiRouter.use('/exchange-rates', createProtectedExchangeRateRoutes(db, exchangeRateScheduler));

apiRouter.use('/payment-history', createPaymentHistoryRoutes(db));
protectedApiRouter.use('/payment-history', createProtectedPaymentHistoryRoutes(db));

apiRouter.use('/monthly-expenses', createMonthlyExpensesRoutes(db));
protectedApiRouter.use('/monthly-expenses', createProtectedMonthlyExpensesRoutes(db));

apiRouter.use('/categories', createCategoriesRoutes(db));
protectedApiRouter.use('/categories', createProtectedCategoriesRoutes(db));

apiRouter.use('/payment-methods', createPaymentMethodsRoutes(db));
protectedApiRouter.use('/payment-methods', createProtectedPaymentMethodsRoutes(db));

// Register routers
app.use('/api', apiRouter);
app.use('/api', protectedApiRouter);

// SPA fallback: serve index.html for all non-API routes
// Use a more specific pattern to avoid path-to-regexp issues
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  // For all other routes, serve the index.html (SPA fallback)
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(404).send('Frontend not found');
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Subscription Management Server is running on http://localhost:${port}`);
  console.log(`📂 Frontend available at: http://localhost:${port}`);
  console.log(`🔧 API available at: http://localhost:${port}/api`);
});