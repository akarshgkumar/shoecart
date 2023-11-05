const Category = require('../models/Category');

const fetchCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({isDeleted: false}).sort({productCount: -1});
        req.categories = categories;  
        next();
    } catch (error) {
        
        res.status(500).send('Internal Server Error');
    }
};

module.exports = fetchCategories;