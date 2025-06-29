const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

// Load environment variables from root .env file (unified configuration)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const port = process.env.PORT || 3001; // Use PORT from environment or default to 3001

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.resolve(__dirname, 'db', 'database.sqlite');

// Initialize database with tables if they don't exist
function initializeDatabase() {
    const db = new Database(dbPath);
    
    try {
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        
        // Check if tables exist
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const hasSubscriptions = tables.some(table => table.name === 'subscriptions');
        const hasSettings = tables.some(table => table.name === 'settings');
        
        if (!hasSubscriptions || !hasSettings) {
            console.log('🔧 Initializing database tables...');
            
            // Create subscriptions table
            db.exec(`
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    plan TEXT NOT NULL,
                    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly')),
                    next_billing_date DATE,
                    last_billing_date DATE,
                    amount DECIMAL(10, 2) NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'USD',
                    payment_method TEXT NOT NULL,
                    start_date DATE,
                    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
                    category TEXT NOT NULL DEFAULT 'other',
                    notes TEXT,
                    website TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Create settings table
            db.exec(`
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    currency TEXT NOT NULL DEFAULT 'USD',
                    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Create triggers
            db.exec(`
                CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at
                AFTER UPDATE ON subscriptions
                FOR EACH ROW
                BEGIN
                    UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END
            `);
            
            db.exec(`
                CREATE TRIGGER IF NOT EXISTS settings_updated_at
                AFTER UPDATE ON settings
                FOR EACH ROW
                BEGIN
                    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END
            `);
            
            // Insert default settings
            const insertDefaultSettings = db.prepare(`
                INSERT OR IGNORE INTO settings (id, currency, theme)
                VALUES (1, 'USD', 'system')
            `);
            insertDefaultSettings.run();
            
            console.log('✅ Database tables initialized successfully!');
        } else {
            console.log('✅ Database tables already exist');
        }
        
        return db;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

const db = initializeDatabase();

// Function to calculate last billing date based on next billing date and billing cycle
function calculateLastBillingDate(nextBillingDate, startDate, billingCycle) {
    const nextDate = new Date(nextBillingDate);
    const startDateObj = new Date(startDate);
    let lastBillingDate;
    
    switch (billingCycle) {
        case 'monthly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setMonth(lastBillingDate.getMonth() - 1);
            break;
        case 'yearly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setFullYear(lastBillingDate.getFullYear() - 1);
            break;
        case 'quarterly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setMonth(lastBillingDate.getMonth() - 3);
            break;
        default:
            return null;
    }
    
    // Ensure last billing date is not before start date
    if (lastBillingDate < startDateObj) {
        lastBillingDate = startDateObj;
    }
    
    return lastBillingDate.toISOString().split('T')[0];
}

// Middleware to check API Key
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.get('X-API-KEY');
    const serverApiKey = process.env.API_KEY;

    if (!serverApiKey) {
        // This is a server configuration error
        console.error('API_KEY not found in .env file. Server is not secured.');
        return res.status(500).json({ message: 'API Key not configured on the server.' });
    }

    if (apiKey && apiKey === serverApiKey) {
        next();
    } else {
        res.status(401).json({ message: 'Invalid or missing API Key' });
    }
};

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


// --- Subscription Routes ---

// GET all subscriptions (Public)
apiRouter.get('/subscriptions', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM subscriptions');
    const subscriptions = stmt.all();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET a single subscription by ID (Public)
apiRouter.get('/subscriptions/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM subscriptions WHERE id = ?');
        const subscription = stmt.get(req.params.id);
        if (subscription) {
            res.json(subscription);
        } else {
            res.status(404).json({ message: 'Subscription not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST a new subscription (Protected)
protectedApiRouter.post('/subscriptions', (req, res) => {
    try {
        const {
            name,
            plan,
            billing_cycle,
            next_billing_date,
            amount,
            currency,
            payment_method,
            start_date,
            status,
            category,
            notes,
            website
        } = req.body;

        // Calculate last billing date automatically
        const last_billing_date = calculateLastBillingDate(next_billing_date, start_date, billing_cycle);

        const stmt = db.prepare(`
            INSERT INTO subscriptions (name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, notes, website)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, notes, website);
        res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST to bulk-insert subscriptions (Protected)
protectedApiRouter.post('/subscriptions/bulk', (req, res) => {
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: 'Request body must be an array of subscriptions.' });
    }

    const insert = db.prepare(`
        INSERT INTO subscriptions (name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, notes, website)
        VALUES (@name, @plan, @billing_cycle, @next_billing_date, @last_billing_date, @amount, @currency, @payment_method, @start_date, @status, @category, @notes, @website)
    `);

    const insertMany = db.transaction((subscriptions) => {
        let insertedCount = 0;
        for (const sub of subscriptions) {
            try {
                const last_billing_date = calculateLastBillingDate(sub.next_billing_date, sub.start_date, sub.billing_cycle);
                insert.run({
                    ...sub,
                    last_billing_date
                });
                insertedCount++;
            } catch (error) {
                console.error('Failed to insert subscription:', sub.name, error);
            }
        }
        return insertedCount;
    });

    try {
        const count = insertMany(req.body);
        res.status(201).json({ message: `Successfully imported ${count} subscriptions.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT to update a subscription (Protected)
protectedApiRouter.put('/subscriptions/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Get the original subscription to have all fields available for last_billing_date calculation
        const getStmt = db.prepare('SELECT * FROM subscriptions WHERE id = ?');
        const originalSub = getStmt.get(id);

        if (!originalSub) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        // --- Dynamically build the UPDATE query ---
        const fields = [];
        const values = [];

        // Map frontend camelCase to backend snake_case and check for updates
        const fieldMapping = {
            name: 'name',
            plan: 'plan',
            billingCycle: 'billing_cycle',
            nextBillingDate: 'next_billing_date',
            amount: 'amount',
            currency: 'currency',
            paymentMethod: 'payment_method',
            startDate: 'start_date',
            status: 'status',
            category: 'category',
            notes: 'notes',
            website: 'website'
        };
        
        // This holds the snake_case version of the updates
        const snakeCaseUpdates = {};
        for (const key in updates) {
            if (Object.prototype.hasOwnProperty.call(fieldMapping, key)) {
                const snakeCaseKey = fieldMapping[key];
                snakeCaseUpdates[snakeCaseKey] = updates[key];
            }
        }

        // Handle special logic for last_billing_date
        const nextBillingDate = snakeCaseUpdates.next_billing_date || originalSub.next_billing_date;
        const startDate = snakeCaseUpdates.start_date || originalSub.start_date;
        const billingCycle = snakeCaseUpdates.billing_cycle || originalSub.billing_cycle;
        
        // Recalculate if relevant fields are changing
        if (snakeCaseUpdates.next_billing_date || snakeCaseUpdates.start_date || snakeCaseUpdates.billing_cycle) {
            snakeCaseUpdates.last_billing_date = calculateLastBillingDate(nextBillingDate, startDate, billingCycle);
        }

        // Build the query parts
        for (const key in snakeCaseUpdates) {
            if (Object.prototype.hasOwnProperty.call(snakeCaseUpdates, key)) {
                fields.push(`${key} = ?`);
                values.push(snakeCaseUpdates[key]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        // Always update the 'updated_at' timestamp
        fields.push('updated_at = CURRENT_TIMESTAMP');

        const stmt = db.prepare(`
            UPDATE subscriptions
            SET ${fields.join(', ')}
            WHERE id = ?
        `);
        
        values.push(id);
        const info = stmt.run(...values);

        if (info.changes > 0) {
            res.json({ message: 'Subscription updated successfully' });
        } else {
            // This case should theoretically not be hit if we check for originalSub existence
            res.status(404).json({ message: 'Subscription not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// DELETE a subscription (Protected)
protectedApiRouter.delete('/subscriptions/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM subscriptions WHERE id = ?');
        const info = stmt.run(req.params.id);
        if (info.changes > 0) {
            res.json({ message: 'Subscription deleted successfully' });
        } else {
            res.status(404).json({ message: 'Subscription not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST to reset all subscriptions (Protected)
protectedApiRouter.post('/subscriptions/reset', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM subscriptions');
        stmt.run();
        res.json({ message: 'All subscriptions have been deleted.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Settings Routes ---

// GET settings (Public)
apiRouter.get('/settings', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
        const settings = stmt.get();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT to update settings (Protected)
protectedApiRouter.put('/settings', (req, res) => {
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
protectedApiRouter.post('/settings/reset', (req, res) => {
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

// Register routers
app.use('/api', apiRouter);
app.use('/api', protectedApiRouter);

// Frontend route handler: serve index.html for root path
app.get('/', (req, res) => {
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