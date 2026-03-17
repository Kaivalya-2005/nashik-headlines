const pool = require('../config/db');
const { generateSlug } = require('../utils/slugify');

exports.getAllTags = async () => {
    const [rows] = await pool.query('SELECT * FROM tags');
    return rows;
};

exports.createTag = async (name) => {
    const slug = generateSlug(name);
    const [result] = await pool.query('INSERT INTO tags (name, slug) VALUES (?, ?)', [name, slug]);
    return { id: result.insertId, name, slug };
};

exports.updateTag = async (id, name) => {
    const slug = generateSlug(name);
    await pool.query('UPDATE tags SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
    return { id, name, slug };
};

exports.deleteTag = async (id) => {
    await pool.query('DELETE FROM tags WHERE id = ?', [id]);
    return true;
};
