const express = require('express');

function createSettingsRoutes(db) {
    const router = express.Router();

    // GET settings (Public)
    router.get('/', (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
            const settings = stmt.get();
            res.json(settings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function createProtectedSettingsRoutes(db) {
    const router = express.Router();

    // PUT to update settings (Protected)
    router.put('/', (req, res) => {
        try {
            const updates = [];
            const params = [];
            
            if (req.body.currency) {
                updates.push('currency = ?');
                params.push(req.body.currency);
            }
            if (req.body.theme) {
                updates.push('theme = ?');
                params.push(req.body.theme);
            }

            if (updates.length === 0) {
                return res.status(400).json({ message: 'No update fields provided' });
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');

            const stmt = db.prepare(`
                UPDATE settings 
                SET ${updates.join(', ')}
                WHERE id = 1
            `);

            const info = stmt.run(...params);

            if (info.changes > 0) {
                res.json({ message: 'Settings updated successfully' });
            } else {
                res.status(404).json({ message: 'Settings not found' });
            }

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST to reset settings (Protected)
    router.post('/reset', (req, res) => {
        try {
            // This will delete the row. A new one will need to be created.
            const stmt = db.prepare('DELETE FROM settings WHERE id = 1');
            stmt.run();
            // Optionally, re-initialize with default settings
            const insertStmt = db.prepare('INSERT INTO settings (id, currency, theme) VALUES (1, ?, ?)');
            insertStmt.run('USD', 'system'); // Default values, api_key is removed
            res.json({ message: 'Settings have been reset to default.' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createSettingsRoutes,
    createProtectedSettingsRoutes
};
