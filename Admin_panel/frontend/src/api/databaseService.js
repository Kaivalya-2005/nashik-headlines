import api from './api';

const getDatabaseStatus = async () => {
    const response = await api.get('/database/status');
    return response.data;
};

const listTables = async () => {
    const response = await api.get('/database/tables');
    return response.data;
};

const getTableSchema = async (tableName) => {
    const response = await api.get(`/database/tables/${tableName}/schema`);
    return response.data;
};

const getTableRows = async (tableName, options = {}) => {
    const {
        limit = 50,
        offset = 0,
        orderBy,
        order = 'DESC',
    } = options;

    const params = { limit, offset, order };
    if (orderBy) params.orderBy = orderBy;

    const response = await api.get(`/database/tables/${tableName}/rows`, { params });
    return response.data;
};

const insertRow = async (tableName, data) => {
    const response = await api.post(`/database/tables/${tableName}/rows`, data);
    return response.data;
};

const updateRow = async (tableName, id, data) => {
    const response = await api.put(`/database/tables/${tableName}/rows/${id}`, data);
    return response.data;
};

const deleteRow = async (tableName, id) => {
    const response = await api.delete(`/database/tables/${tableName}/rows/${id}`);
    return response.data;
};

const executeQuery = async (sql, replacements = {}) => {
    const response = await api.post('/database/query', { sql, replacements });
    return response.data;
};

const databaseService = {
    getDatabaseStatus,
    listTables,
    getTableSchema,
    getTableRows,
    insertRow,
    updateRow,
    deleteRow,
    executeQuery,
};

export default databaseService;
