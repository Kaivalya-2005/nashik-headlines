const analyzeSEO = (article) => {
    let score = 100;
    const report = [];
    const { title, content, seo } = article;
    const { meta_title, meta_description, focus_keywords } = seo || {};

    // 1. Title Analysis
    if (!title) {
        score -= 20;
        report.push({ rule: 'Title', status: 'Fail', message: 'Title is missing.' });
    } else if (title.length < 20) {
        score -= 10;
        report.push({ rule: 'Title Length', status: 'Warn', message: 'Title is too short (under 20 characters).' });
    } else if (title.length > 100) {
        score -= 5;
        report.push({ rule: 'Title Length', status: 'Warn', message: 'Title is too long (over 100 characters).' });
    } else {
        report.push({ rule: 'Title Length', status: 'Pass', message: 'Title length is optimal.' });
    }

    // 2. Meta Description Analysis
    if (!meta_description) {
        score -= 20;
        report.push({ rule: 'Meta Description', status: 'Fail', message: 'Meta description is missing.' });
    } else if (meta_description.length < 50) {
        score -= 10;
        report.push({ rule: 'Meta Description Length', status: 'Warn', message: 'Meta description is too short.' });
    } else if (meta_description.length > 170) {
        score -= 5;
        report.push({ rule: 'Meta Description Length', status: 'Warn', message: 'Meta description is too long.' });
    } else {
        report.push({ rule: 'Meta Description Length', status: 'Pass', message: 'Meta description length is optimal.' });
    }

    // 3. Focus Keywords Analysis
    if (!focus_keywords || focus_keywords.length === 0) {
        score -= 20;
        report.push({ rule: 'Focus Keywords', status: 'Fail', message: 'No focus keywords set.' });
    } else {
        const missingKeywords = [];
        focus_keywords.forEach(keyword => {
            const regex = new RegExp(keyword, 'i');
            if (!regex.test(title) && !regex.test(content)) {
                missingKeywords.push(keyword);
            }
        });

        if (missingKeywords.length > 0) {
            score -= (missingKeywords.length * 5);
            report.push({ rule: 'Keyword Usage', status: 'Warn', message: `Keywords missing in content/title: ${missingKeywords.join(', ')}` });
        } else {
            report.push({ rule: 'Keyword Usage', status: 'Pass', message: 'All focus keywords found in content or title.' });
        }
    }

    // 4. Content Length
    // Strip HTML tags for rough count
    const textContent = content ? content.replace(/<[^>]*>/g, '') : '';
    if (textContent.length < 300) {
        score -= 10;
        report.push({ rule: 'Content Length', status: 'Warn', message: 'Content is too short (under 300 characters).' });
    } else {
        report.push({ rule: 'Content Length', status: 'Pass', message: 'Content length is good.' });
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return { score, report };
};

module.exports = { analyzeSEO };
