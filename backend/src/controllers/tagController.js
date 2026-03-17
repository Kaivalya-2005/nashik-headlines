const tagService = require('../services/tagService');

exports.getAllTags = async (req, res, next) => {
    try {
        const tags = await tagService.getAllTags();
        res.status(200).json({ success: true, data: tags });
    } catch (error) {
        next(error);
    }
};

exports.createTag = async (req, res, next) => {
    try {
        const tag = await tagService.createTag(req.body.name);
        res.status(201).json({ success: true, data: tag });
    } catch (error) {
        next(error);
    }
};

exports.updateTag = async (req, res, next) => {
    try {
        const tag = await tagService.updateTag(req.params.id, req.body.name);
        res.status(200).json({ success: true, data: tag });
    } catch (error) {
        next(error);
    }
};

exports.deleteTag = async (req, res, next) => {
    try {
        await tagService.deleteTag(req.params.id);
        res.status(200).json({ success: true, message: 'Tag deleted successfully' });
    } catch (error) {
        next(error);
    }
};
