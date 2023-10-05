const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const productSchema = new mongoose.Schema(
    {
      name: String,
      color: String,
      sizes: [Number], 
      brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brand", 
      },
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category", 
      },
      description: String,
      stock: Number,
      price: Number,
      mainImage: String, 
      images: [String],
      isDeleted: {
        type: Boolean,
        default: false,
      },
      estProfit: Number,
    },
    {
      timestamps: true,
    }
  );

productSchema.plugin(mongoosePaginate);


const Product = mongoose.model('Product', productSchema);

module.exports = Product;
