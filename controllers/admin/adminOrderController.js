const Product = require("../../models/Product");
const formatDate = require("../../utils/formatDate");
const Order = require("../../models/Order");

exports.viewOrders = async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    populate: ["user", "products.product"],
    customLabels: {
      docs: "orders",
      totalDocs: "orderCount",
    },
  };

  try {
    const result = await Order.paginate({}, options);

    res.render("admin/admin-view-orders", {
      orders: result.orders,
      orderCount: result.orderCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).send("Internal server error");
  }
};

exports.viewSingleOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "products.product"
    );
    res.render("admin/admin-view-single-order", { order });
  } catch (error) {
    console.error("Error fetching order:", error);
    req.flash("error", "Sorry, Server Error");
    res.redirect("/admin/order/view-orders");
  }
};

exports.editOrderGet = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("admin/admin-edit-order", {
      order: order,
      formatDate: formatDate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

exports.editOrderPost = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_name, shipped_date, delivery_date, status, order_email } =
      req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/admin/order/view-orders");
    }

    let updateFields = {
      "address.name": order_name,
      "address.email": order_email,
      shippedDate: shipped_date,
      deliveryDate: delivery_date,
      status: status,
    };
    if (status === "Delivered") {
      updateFields.totalAmountPaid = order.totalAfterDiscount;
    } else if (status === "Cancelled" || status === "Returned") {
      updateFields[`${status.toLowerCase()}Date`] = new Date();

      for (let orderedProduct of order.products) {
        const product = await Product.findById(orderedProduct.product);
        product.stock += orderedProduct.quantity;
        product.totalSoldItems -= orderedProduct.quantity;
        await product.save();
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateFields, {
      new: true,
    });

    await updatedOrder.save();

    if (updatedOrder) {
      req.flash("success", "Order updated successfully");
      res.redirect("/admin/order/view-orders");
    } else {
      req.flash("error", "Failed to update Order");
      res.redirect("/admin/order/view-orders");
    }
  } catch (error) {
    console.error("Error updating order:", error);
    req.flash("error", "An error occurred while updating the order.");
    res.redirect("/admin/order/view-orders");
  }
};

exports.searchOrders = async (req, res) => {
  let searchQuery = req.query.searchQuery;

  if (searchQuery && searchQuery.startsWith("#")) {
    searchQuery = searchQuery.substring(1);
  }
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    populate: ["user", "products.product"],
    customLabels: {
      docs: "orders",
      totalDocs: "orderCount",
    },
  };

  try {
    let query = {};

    if (searchQuery) {
      query.shortId = new RegExp(searchQuery, "i");
    }

    const result = await Order.paginate(query, options);

    if (result.orderCount === 0) {
      req.flash("error", "No orders found");
      return res.redirect("/admin/order/view-orders");
    }

    res.render("admin/admin-view-orders", {
      orders: result.orders,
      orderCount: result.orderCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (error) {
    console.error("Search error:", error);
    req.flash("error", "Unexpected Error");
    res.redirect("/admin/order/view-orders");
  }
};

exports.searchOrderEmail = async (req, res) => {
  const emailQuery = req.query.emailQuery;

  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    populate: ["user", "products.product"],
    customLabels: {
      docs: "orders",
      totalDocs: "orderCount",
    },
  };

  try {
    let query = {};

    if (emailQuery) {
      query["address.email"] = new RegExp(emailQuery, "i");
    }

    const result = await Order.paginate(query, options);

    if (result.orderCount === 0) {
      req.flash("error", "No orders found with that email");
      return res.redirect("/admin/order/view-orders");
    }

    res.render("admin/admin-view-orders", {
      orders: result.orders,
      orderCount: result.orderCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (error) {
    console.error("Search error:", error);
    req.flash("error", "Unexpected Error");
    res.redirect("/admin/order/view-orders");
  }
};
