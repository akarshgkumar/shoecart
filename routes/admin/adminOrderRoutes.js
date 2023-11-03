const express = require("express");
const router = express.Router();
const adminOrderController = require("../../controllers/admin/adminOrderController");

// Route to view all orders
router.get("/view-orders", adminOrderController.viewOrders);

// Route to view a single order by ID
router.get("/view-single-order/:orderId", adminOrderController.viewSingleOrder);

// Routes for getting and posting order edits
router.get("/edit-order/:orderId", adminOrderController.editOrderGet);
router.post("/edit-order/:orderId", adminOrderController.editOrderPost); 

// Route to search for orders
router.get("/search-orders", adminOrderController.searchOrders);

// Route to search for orders by email
router.get("/search-order-email", adminOrderController.searchOrderEmail);

module.exports = router;
