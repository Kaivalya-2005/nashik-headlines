const { sequelize } = require('../config/db');

const ALLOWED_QUERY_TYPES = new Set([
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SHOW', 'DESCRIBE', 'EXPLAIN'
]);

const FORBIDDEN_SQL_PATTERNS = [
    /\bDROP\b/i,
    /\bTRUNCATE\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bSHUTDOWN\b/i,
    /\bFLUSH\b/i,
];

const isSafeIdentifier = (value) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value || '');

const getAllTables = async () => {
    const [rows] = await sequelize.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
         ORDER BY table_name`
    );
    return rows.map((row) => row.table_name);
};

const getPrimaryKey = async (tableName) => {
    const [rows] = await sequelize.query(
        `SELECT k.COLUMN_NAME as column_name
         FROM information_schema.TABLE_CONSTRAINTS t
         JOIN information_schema.KEY_COLUMN_USAGE k
           ON t.CONSTRAINT_NAME = k.CONSTRAINT_NAME
          AND t.TABLE_SCHEMA = k.TABLE_SCHEMA
          AND t.TABLE_NAME = k.TABLE_NAME
         WHERE t.TABLE_SCHEMA = DATABASE()
           AND t.TABLE_NAME = :tableName
           AND t.CONSTRAINT_TYPE = 'PRIMARY KEY'
         ORDER BY k.ORDINAL_POSITION
         LIMIT 1`,
        { replacements: { tableName } }
    );
    return rows[0]?.column_name || null;
};

const ensureTableExists = async (tableName) => {
    if (!isSafeIdentifier(tableName)) return false;
    const tables = await getAllTables();
    return tables.includes(tableName);
};

exports.getDatabaseStatus = async (req, res) => {
    try {
        const [[meta]] = await sequelize.query('SELECT DATABASE() as db, VERSION() as version, NOW() as now_ts');
        const [vars] = await sequelize.query(
            `SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running','Uptime','Queries')`
        );

        const status = {};
        vars.forEach((row) => {
            status[row.Variable_name] = row.Value;
        });

        res.status(200).json({
            database: meta.db,
            version: meta.version,
            now: meta.now_ts,
            server_status: status,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch database status', error: error.message });
    }
};

exports.listTables = async (req, res) => {
    try {
        const tables = await getAllTables();
        res.status(200).json({ count: tables.length, tables });
    } catch (error) {
        res.status(500).json({ message: 'Failed to list tables', error: error.message });
    }
};

exports.getTableSchema = async (req, res) => {
    try {
        const { tableName } = req.params;
        const exists = await ensureTableExists(tableName);
        if (!exists) return res.status(404).json({ message: 'Table not found' });

        const [columns] = await sequelize.query(
            `SELECT COLUMN_NAME as column_name,
                    COLUMN_TYPE as column_type,
                    IS_NULLABLE as is_nullable,
                    COLUMN_DEFAULT as column_default,
                    COLUMN_KEY as column_key,
                    EXTRA as extra
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = :tableName
             ORDER BY ORDINAL_POSITION`,
            { replacements: { tableName } }
        );

        const primaryKey = await getPrimaryKey(tableName);

        res.status(200).json({ table: tableName, primary_key: primaryKey, columns });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch schema', error: error.message });
    }
};

exports.getTableRows = async (req, res) => {
    try {
        const { tableName } = req.params;
        const exists = await ensureTableExists(tableName);
        if (!exists) return res.status(404).json({ message: 'Table not found' });

        const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 500);
        const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
        const order = String(req.query.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const primaryKey = await getPrimaryKey(tableName);
        const orderByParam = req.query.orderBy;
        const orderBy = isSafeIdentifier(orderByParam)
            ? orderByParam
            : (primaryKey || '1');

        const [countRows] = await sequelize.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
        const total = countRows[0].total;

        const query = orderBy === '1'
            ? `SELECT * FROM \`${tableName}\` LIMIT :limit OFFSET :offset`
            : `SELECT * FROM \`${tableName}\` ORDER BY \`${orderBy}\` ${order} LIMIT :limit OFFSET :offset`;

        const [rows] = await sequelize.query(query, { replacements: { limit, offset } });

        res.status(200).json({
            table: tableName,
            total,
            limit,
            offset,
            orderBy: orderBy === '1' ? null : orderBy,
            order,
            rows,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch rows', error: error.message });
    }
};

exports.insertTableRow = async (req, res) => {
    try {
        const { tableName } = req.params;
        const payload = req.body || {};

        const exists = await ensureTableExists(tableName);
        if (!exists) return res.status(404).json({ message: 'Table not found' });
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !Object.keys(payload).length) {
            return res.status(400).json({ message: 'Request body must be a non-empty object' });
        }

        const keys = Object.keys(payload).filter((key) => isSafeIdentifier(key));
        if (!keys.length) return res.status(400).json({ message: 'No valid columns provided' });

        const columnsSql = keys.map((key) => `\`${key}\``).join(', ');
        const valuesSql = keys.map((key) => `:${key}`).join(', ');

        const [result] = await sequelize.query(
            `INSERT INTO \`${tableName}\` (${columnsSql}) VALUES (${valuesSql})`,
            { replacements: payload }
        );

        res.status(201).json({ message: 'Row inserted', insertId: result.insertId || null, affectedRows: result.affectedRows || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Failed to insert row', error: error.message });
    }
};

exports.updateTableRow = async (req, res) => {
    try {
        const { tableName, id } = req.params;
        const payload = req.body || {};

        const exists = await ensureTableExists(tableName);
        if (!exists) return res.status(404).json({ message: 'Table not found' });

        const primaryKey = await getPrimaryKey(tableName);
        if (!primaryKey) return res.status(400).json({ message: 'Table has no primary key; use SQL query endpoint' });

        const keys = Object.keys(payload).filter((key) => isSafeIdentifier(key) && key !== primaryKey);
        if (!keys.length) return res.status(400).json({ message: 'No valid columns provided for update' });

        const setSql = keys.map((key) => `\`${key}\` = :${key}`).join(', ');
        const replacements = { ...payload, __rowId: id };

        const [result] = await sequelize.query(
            `UPDATE \`${tableName}\` SET ${setSql} WHERE \`${primaryKey}\` = :__rowId`,
            { replacements }
        );

        res.status(200).json({ message: 'Row updated', affectedRows: result.affectedRows || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update row', error: error.message });
    }
};

exports.deleteTableRow = async (req, res) => {
    try {
        const { tableName, id } = req.params;

        const exists = await ensureTableExists(tableName);
        if (!exists) return res.status(404).json({ message: 'Table not found' });

        const primaryKey = await getPrimaryKey(tableName);
        if (!primaryKey) return res.status(400).json({ message: 'Table has no primary key; use SQL query endpoint' });

        const [result] = await sequelize.query(
            `DELETE FROM \`${tableName}\` WHERE \`${primaryKey}\` = :__rowId`,
            { replacements: { __rowId: id } }
        );

        res.status(200).json({ message: 'Row deleted', affectedRows: result.affectedRows || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete row', error: error.message });
    }
};

exports.executeSqlQuery = async (req, res) => {
    try {
        const { sql, replacements = {} } = req.body || {};
        if (!sql || typeof sql !== 'string') {
            return res.status(400).json({ message: 'sql is required' });
        }

        const queryType = sql.trim().split(/\s+/)[0].toUpperCase();
        if (!ALLOWED_QUERY_TYPES.has(queryType)) {
            return res.status(400).json({ message: `Query type ${queryType} not allowed` });
        }

        const isForbidden = FORBIDDEN_SQL_PATTERNS.some((pattern) => pattern.test(sql));
        if (isForbidden) {
            return res.status(400).json({ message: 'Unsafe SQL keyword detected' });
        }

        const [result, metadata] = await sequelize.query(sql, { replacements });

        res.status(200).json({
            queryType,
            rowCount: Array.isArray(result) ? result.length : (result?.affectedRows || 0),
            result,
            metadata,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to execute query', error: error.message });
    }
};
