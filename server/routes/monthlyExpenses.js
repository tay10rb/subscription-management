const express = require('express');
const MonthlyExpenseController = require('../controllers/monthlyExpenseController');

function createMonthlyExpensesRoutes(db) {
    const router = express.Router();
    const controller = new MonthlyExpenseController(db);

    // GET monthly expenses with filters (Public)
    router.get('/', controller.getMonthlyExpenses);

    // GET single monthly expense record (Public)
    router.get('/:monthKey', controller.getMonthlyExpense);

    // GET monthly expenses summary (Public)
    router.get('/summary/totals', controller.getMonthlyExpensesSummary);



    return router;
}

function createProtectedMonthlyExpensesRoutes(db) {
    const router = express.Router();
    const controller = new MonthlyExpenseController(db);

    // POST to reset all monthly expenses data (Protected)
    router.post('/reset', controller.resetMonthlyExpenses);

    // POST recalculate all monthly expenses (Protected)
    router.post('/recalculate', controller.recalculateMonthlyExpenses);

    // POST process specific payment for monthly expenses (Protected)
    router.post('/process-payment/:paymentId', controller.processPaymentForMonthlyExpenses);

    // DELETE monthly expense record (Protected)
    router.delete('/:monthKey', controller.deleteMonthlyExpense);

    return router;
}

module.exports = {
    createMonthlyExpensesRoutes,
    createProtectedMonthlyExpensesRoutes
};
