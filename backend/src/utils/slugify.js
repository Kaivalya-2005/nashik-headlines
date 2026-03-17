const slugifyLib = require('slugify');

/**
 * Generates an SEO-friendly slug.
 * @param {string} text - The input string to slugify.
 * @returns {string} The slugified string.
 */
const generateSlug = (text) => {
    if (!text) return '';
    return slugifyLib(text, {
        replacement: '-',
        remove: /[*+~.()'"!:@]/g,
        lower: true,
        strict: true,
        trim: true
    });
};

module.exports = { generateSlug };
