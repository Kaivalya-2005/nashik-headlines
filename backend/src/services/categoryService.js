const pool = require('../config/db');
const { generateSlug } = require('../utils/slugify');

exports.getAllCategories = async () => {
    const [rows] = await pool.query('SELECT * FROM categories');
    return rows;
};

exports.getCategoryBySlug = async (slug) => {
    const [rows] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
    return rows[0];
};

exports.createCategory = async (name) => {
    const slug = generateSlug(name);
    const [result] = await pool.query('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    return { id: result.insertId, name, slug };
};

exports.updateCategory = async (id, name) => {
    const slug = generateSlug(name);
    await pool.query('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
    return { id, name, slug };
};

exports.deleteCategory = async (id) => {
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    return true;
};
