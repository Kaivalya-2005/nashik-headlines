const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { roleCheck } = require('../middleware/roleMiddleware');
const {
    getDatabaseStatus,
    listTables,
    getTableSchema,
    getTableRows,
    insertTableRow,
    updateTableRow,
    deleteTableRow,
    executeSqlQuery,
} = require('../controllers/databaseController');

router.use(protect);
router.use(roleCheck(['ADMIN']));

router.get('/status', getDatabaseStatus);
router.get('/tables', listTables);
router.get('/tables/:tableName/schema', getTableSchema);
router.get('/tables/:tableName/rows', getTableRows);
router.post('/tables/:tableName/rows', insertTableRow);
router.put('/tables/:tableName/rows/:id', updateTableRow);
router.delete('/tables/:tableName/rows/:id', deleteTableRow);
router.post('/query', executeSqlQuery);

module.exports = router;
