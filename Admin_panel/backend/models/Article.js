const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    rawInput: {
        type: String,
        required: [true, 'Please add raw input data']
    },
    content: {
        type: String,
        default: ''
    },
    summary: {
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
    focus_keyphrase: {
        type: String,
        default: ''
    },
    seo: {
        meta_title: String,
        meta_description: String,
        slug: String,
        focus_keywords: [String],
        seoScore: { type: Number, default: 0 },
        seoReport: [{ rule: String, status: String, message: String }]
    },
    quote_block: {
        type: String,
        default: ''
    },
    source_name: {
        type: String,
        default: ''
    },
    source_url: {
        type: String,
        default: ''
    },
    via_name: {
        type: String,
        default: ''
    },
    via_url: {
        type: String,
        default: ''
    },
    custom_labels: [{
        label: String,
        url: String
    }],
    tags: [String],
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
        isFeatured: { type: Boolean, default: false },
        type: { type: String, enum: ['feature', 'context', 'supporting', 'additional'], default: 'feature' },
        imagePrompt: String, // AI image generation prompt
        description: String // Image description
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Article', articleSchema);
