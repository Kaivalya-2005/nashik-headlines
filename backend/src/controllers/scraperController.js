const scraperService = require('../services/scraperService');

/**
 * POST /api/internal/scrape
 * Body: { source_id, title, url, content }
 */
exports.createRawArticle = async (req, res, next) => {
  try {
    const { source_id, title, url, content } = req.body;

    // 1. Validate required fields
    if (!title || !url) {
      return res.status(400).json({
        success : false,
        message : 'title and url are required',
      });
    }

    // 2. Duplicate check
    const isDuplicate = await scraperService.checkDuplicate(url);
    if (isDuplicate) {
      return res.status(409).json({
        success : false,
        message : 'Duplicate URL — article already exists',
        url,
      });
    }

    // 3. Insert
    const article = await scraperService.insertRawArticle({ source_id, title, url, content });

    return res.status(201).json({
      success : true,
      message : 'Raw article ingested',
      data    : article,
    });
  } catch (err) {
    next(err);
  }
};
