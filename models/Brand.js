const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
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

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
