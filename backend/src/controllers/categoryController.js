const categoryService = require('../services/categoryService');

exports.getAllCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

exports.getCategoryBySlug = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryBySlug(req.params.slug);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategory(req.body.name);
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body.name);
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        await categoryService.deleteCategory(req.params.id);
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        next(error);
    }
};
