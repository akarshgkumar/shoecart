const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/user/userOrderController');

router.get('/checkout', orderController.checkout);
router.post('/cancel-order', orderController.cancelOrder);
router.get('/view-single-order/:orderId', orderController.viewSingleOrder);
router.get('/select-address', orderController.selectAddress);
router.post('/validate-cart', orderController.validateCart);
router.post('/place-order', orderController.placeOrder);
router.post('/validate-order', orderController.validateOrder);
router.get('/return-reason/:orderId', orderController.getReturnReason);
router.post('/return-reason', orderController.postReturnReason);
router.get('/success/:orderId', orderController.orderSuccess);
router.post('/apply-coupon', orderController.applyCoupon);
router.get('/invoices/download', orderController.downloadInvoice);


module.exports = router;
