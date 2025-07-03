const express = require('express');

function createExchangeRateRoutes(db) {
    const router = express.Router();

    // GET all exchange rates (Public)
    router.get('/', (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM exchange_rates ORDER BY from_currency, to_currency');
            const rates = stmt.all();
            res.json(rates);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET specific exchange rate (Public)
    router.get('/:from/:to', (req, res) => {
        try {
            const { from, to } = req.params;
            const stmt = db.prepare('SELECT * FROM exchange_rates WHERE from_currency = ? AND to_currency = ?');
            const rate = stmt.get(from.toUpperCase(), to.toUpperCase());

            if (!rate) {
                return res.status(404).json({ error: 'Exchange rate not found' });
            }

            res.json(rate);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function createProtectedExchangeRateRoutes(db, exchangeRateScheduler) {
    const router = express.Router();

    // POST to manually update exchange rates (Protected)
    router.post('/update', async (req, res) => {
        try {
            const result = await exchangeRateScheduler.updateExchangeRates();

            if (result.success) {
                res.json({
                    message: result.message,
                    updatedAt: result.updatedAt
                });
            } else {
                res.status(500).json({ error: result.message });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET exchange rate scheduler status (Protected)
    router.get('/status', (req, res) => {
        try {
            const status = exchangeRateScheduler.getStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createExchangeRateRoutes,
    createProtectedExchangeRateRoutes
};
