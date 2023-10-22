const Category = require('../models/Category');

const fetchCategories = async (req, res, next) => {
    try {
        const categories = await Category.find();
        req.categories = categories;  
        next();
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = fetchCategories;