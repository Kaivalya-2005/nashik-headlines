const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const axios = require('axios');

const uploadMedia = async (filePath, altText, caption) => {
    const wpUrl = process.env.WP_API_URL;
    const username = process.env.WP_USERNAME;
    const password = process.env.WP_APP_PASSWORD;

    if (!wpUrl || !username || !password) {
        throw new Error('WordPress credentials not configured');
    }

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);

    try {
        const form = new FormData();
        form.append('file', fileStream);
        form.append('title', fileName);
        form.append('caption', caption || '');
        form.append('alt_text', altText || '');

        // Note: WP REST API /media endpoint expects binary data in body for simple upload, 
        // or multipart for setting meta. Let's use standard POST with Content-Disposition 
        // if we want simple, but form-data is better for meta.
        // Actually, WP API often requires the file in body and Content-Disposition header 
        // for the file itself, and then a second call to update meta.
        // BUT, we can try the multipart method if supported, otherwise 2-step.
        // Let's try the direct binary upload first + update, or just POST to /media with form-data.
        // WP API doc says POST /wp/v2/media accepts multipart/form-data.

        const response = await axios.post(`${wpUrl}/media`, form, {
            headers: {
                'Authorization': authHeader,
                ...form.getHeaders()
            }
        });

        return {
            id: response.data.id,
            source_url: response.data.source_url
        };
    } catch (error) {
        console.error('WP Media Upload Error:', error.response ? error.response.data : error.message);
        console.error('Attempted File Path:', filePath);
        throw new Error('Failed to upload image to WordPress: ' + (error.response?.data?.message || error.message));
    }
};

const createDraftPost = async (article) => {
    const wpUrl = process.env.WP_API_URL;
    const username = process.env.WP_USERNAME;
    const password = process.env.WP_APP_PASSWORD;

    if (!wpUrl || !username || !password) {
        throw new Error('WordPress credentials not configured in .env');
    }

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    try {
        // 1. Upload Images to WP (if any)
        let featuredMediaId = null;
        let contentWithImages = article.content;

        if (article.images && article.images.length > 0) {
            for (const img of article.images) {
                if (img.path) { // Only upload if we have local file path
                    const uploaded = await uploadMedia(img.path, img.altText, img.caption);

                    // Update article image with WP ID (optional, but good for sync)
                    img.wpId = uploaded.id;

                    // Set Featured Image if marked
                    if (img.isFeatured) {
                        featuredMediaId = uploaded.id;
                    }

                    // Append image to content (Simple Append) 
                    // In a real editor we would place it where the cursor was, 
                    // but here we just append to bottom or top.
                    // Let's append to the top of content for visibility.
                    const imgHtml = `
                        <figure class="wp-block-image">
                            <img src="${uploaded.source_url}" alt="${img.altText || ''}" />
                            <figcaption>${img.caption || ''}</figcaption>
                        </figure>
                    `;
                    contentWithImages = imgHtml + contentWithImages;
                }
            }
        }

        const postData = {
            title: article.title,
            content: contentWithImages,
            status: 'draft',
            featured_media: featuredMediaId, // Attach featured image
            meta: {
                // 'sp_meta_title': article.seo?.meta_title, 
                // 'sp_meta_description': article.seo?.meta_description
            }
        };

        const response = await axios.post(`${wpUrl}/posts`, postData, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        return {
            wpId: response.data.id,
            wpUrl: response.data.link
        };

    } catch (error) {
        console.error('WordPress API Error:', error.response ? error.response.data : error.message);
        console.error('Detailed Error Config:', error.config); // Check URL/Headers
        throw new Error('Failed to push draft to WordPress: ' + (error.response?.data?.message || error.message));
    }
};

module.exports = { createDraftPost };
