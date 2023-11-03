const express = require('express');
const router = express.Router();
const adminAccountController = require('../../controllers/admin/adminAccountController');
const authenticateAdmin = require('../../middlewares/admin/authenticateAdmin');

// Public routes
router.get('/', adminAccountController.adminLoginGet);
router.post('/', adminAccountController.adminLoginPost);

// Middleware to authenticate admin for subsequent routes
router.use(authenticateAdmin);

// Protected routes for authenticated admin only
router.get('/dashboard', adminAccountController.adminDashboard);
router.post('/sales/report', adminAccountController.adminSalesReport);
router.get('/download/sales/report/pdf/:reportId', adminAccountController.downloadSalesReportPDF);
router.get('/download/sales/report/excel/:reportId', adminAccountController.downloadSalesReportExcel);
router.get('/logout', adminAccountController.adminLogout);

module.exports = router;
