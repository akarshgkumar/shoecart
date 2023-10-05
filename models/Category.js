const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
      name: String,
      isDeleted: {
        type: Boolean,
        default: false,
      }
    },
    {
      timestamps: true,
    }
  );
  

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
