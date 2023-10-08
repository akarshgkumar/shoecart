const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },
  products: [{
    productId: String,
    quantity: Number,
    name: String,
    price: Number,
    image: String
  }]
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
