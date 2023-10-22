const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const categorySchema = new mongoose.Schema(
    {
      name: {
        type: String,
        unique: true
      },
      imageUrl : String,
    },
    {
      timestamps: true,
    }
  );

categorySchema.plugin(mongoosePaginate);


const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
