const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    rawInput: {
        type: String,
        required: [true, 'Please add raw input data']
    },
    content: {
        type: String,
        default: ''
    },
    generationStatus: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: null
    },
    generationError: {
        type: String,
        default: null
    },
    generationStartedAt: {
        type: Date
    },
    generationCompletedAt: {
        type: Date
    },
    language: {
        type: String,
        default: 'mr'
    },
    seo: {
        meta_title: String,
        meta_description: String,
        focus_keywords: [String],
        seoScore: { type: Number, default: 0 },
        seoReport: [{ rule: String, status: String, message: String }]
    },
    status: {
        type: String,
        enum: ['DRAFT_LOCAL', 'DRAFT_WP', 'PUBLISHED'],
        default: 'DRAFT_LOCAL'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    wpId: {
        type: Number, // WordPress Post ID
        default: null
    },
    wpUrl: {
        type: String, // Published URL
        default: null
    },
    images: [{
        url: String, // Local path or WP URL
        path: String, // Local filesystem path
        filename: String,
        size: Number,
        mimetype: String,
        caption: String,
        altText: String,
        wpId: Number, // WordPress Media ID
        isFeatured: { type: Boolean, default: false }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Article', articleSchema);
