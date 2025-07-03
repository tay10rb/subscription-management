const express = require('express');

function createCategoriesRoutes(db) {
    const router = express.Router();

    // GET all categories (Public)
    router.get('/', (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM categories ORDER BY label');
            const categories = stmt.all();
            res.json(categories);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function createProtectedCategoriesRoutes(db) {
    const router = express.Router();

    // POST a new category (Protected)
    router.post('/', (req, res) => {
        try {
            const { value, label } = req.body;

            if (!value || !label) {
                return res.status(400).json({ error: 'Value and label are required' });
            }

            const stmt = db.prepare('INSERT INTO categories (value, label) VALUES (?, ?)');
            const info = stmt.run(value, label);

            res.status(201).json({
                id: info.lastInsertRowid,
                value,
                label,
                message: 'Category created successfully'
            });
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(409).json({ error: 'Category with this value already exists' });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // PUT to update a category (Protected)
    router.put('/:value', (req, res) => {
        try {
            const { value: oldValue } = req.params;
            const { value: newValue, label } = req.body;

            if (!newValue || !label) {
                return res.status(400).json({ error: 'Value and label are required' });
            }

            const stmt = db.prepare('UPDATE categories SET value = ?, label = ? WHERE value = ?');
            const info = stmt.run(newValue, label, oldValue);

            if (info.changes > 0) {
                res.json({ message: 'Category updated successfully' });
            } else {
                res.status(404).json({ error: 'Category not found' });
            }
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(409).json({ error: 'Category with this value already exists' });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // DELETE a category (Protected)
    router.delete('/:value', (req, res) => {
        try {
            const { value } = req.params;

            const stmt = db.prepare('DELETE FROM categories WHERE value = ?');
            const info = stmt.run(value);

            if (info.changes > 0) {
                res.json({ message: 'Category deleted successfully' });
            } else {
                res.status(404).json({ error: 'Category not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function createPaymentMethodsRoutes(db) {
    const router = express.Router();

    // GET all payment methods (Public)
    router.get('/', (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM payment_methods ORDER BY label');
            const paymentMethods = stmt.all();
            res.json(paymentMethods);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function createProtectedPaymentMethodsRoutes(db) {
    const router = express.Router();

    // POST a new payment method (Protected)
    router.post('/', (req, res) => {
        try {
            const { value, label } = req.body;

            if (!value || !label) {
                return res.status(400).json({ error: 'Value and label are required' });
            }

            const stmt = db.prepare('INSERT INTO payment_methods (value, label) VALUES (?, ?)');
            const info = stmt.run(value, label);

            res.status(201).json({
                id: info.lastInsertRowid,
                value,
                label,
                message: 'Payment method created successfully'
            });
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(409).json({ error: 'Payment method with this value already exists' });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // PUT to update a payment method (Protected)
    router.put('/:value', (req, res) => {
        try {
            const { value: oldValue } = req.params;
            const { value: newValue, label } = req.body;

            if (!newValue || !label) {
                return res.status(400).json({ error: 'Value and label are required' });
            }

            const stmt = db.prepare('UPDATE payment_methods SET value = ?, label = ? WHERE value = ?');
            const info = stmt.run(newValue, label, oldValue);

            if (info.changes > 0) {
                res.json({ message: 'Payment method updated successfully' });
            } else {
                res.status(404).json({ error: 'Payment method not found' });
            }
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(409).json({ error: 'Payment method with this value already exists' });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // DELETE a payment method (Protected)
    router.delete('/:value', (req, res) => {
        try {
            const { value } = req.params;

            const stmt = db.prepare('DELETE FROM payment_methods WHERE value = ?');
            const info = stmt.run(value);

            if (info.changes > 0) {
                res.json({ message: 'Payment method deleted successfully' });
            } else {
                res.status(404).json({ error: 'Payment method not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createCategoriesRoutes,
    createProtectedCategoriesRoutes,
    createPaymentMethodsRoutes,
    createProtectedPaymentMethodsRoutes
};
