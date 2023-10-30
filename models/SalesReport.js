const mongoose = require("mongoose");

const salesReportsSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    totalOrders: { type: Number, required: true },
    totalSales: { type: Number, required: true },
    totalRevenue: { type: Number, required: true },
    totalDeliveredOrders: { type: Number, required: true },
    totalCancelledOrders: { type: Number, required: true },
    totalReturnedOrders: { type: Number, required: true },
    totalProcessingOrders: { type: Number, required: true },
    totalShippedOrders: { type: Number, required: true },
    categories: {
      type: [
        {
          name: String,
          totalSalesAmount: Number,
          unitsSold: Number,
          cancelledCount: Number,
          returnedCount: Number,
        },
      ],
      required: true,
    },
    brands: {
      type: [
        {
          name: String,
          totalSalesAmount: Number,
          unitsSold: Number,
          cancelledCount: Number,
          returnedCount: Number,
        },
      ],
      required: true,
    },
    products: {
      type: [
        {
          name: String,
          totalSalesAmount: Number,
          unitsSold: Number,
          cancelledCount: Number,
          returnedCount: Number,
        },
      ],
      required: true,
    },
  },
  { timestamps: true }
);

const SalesReport = mongoose.model("SalesReport", salesReportsSchema);

module.exports = SalesReport;
