import React, { useEffect, useMemo, useState } from 'react';
import databaseService from '../api/databaseService';

const DatabaseExplorer = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [dbStatus, setDbStatus] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [schema, setSchema] = useState(null);
    const [rowsData, setRowsData] = useState({ rows: [], total: 0, limit: 50, offset: 0, orderBy: null, order: 'DESC' });

    const [limit, setLimit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState('DESC');
    const [orderBy, setOrderBy] = useState('');

    const [insertJson, setInsertJson] = useState('{}');
    const [updateRowId, setUpdateRowId] = useState('');
    const [updateJson, setUpdateJson] = useState('{}');
    const [deleteRowId, setDeleteRowId] = useState('');

    const [sql, setSql] = useState('SELECT * FROM users LIMIT 20;');
    const [sqlReplacementsJson, setSqlReplacementsJson] = useState('{}');
    const [sqlResult, setSqlResult] = useState(null);

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            loadTableData(selectedTable);
        }
    }, [selectedTable]);

    const primaryKey = useMemo(() => schema?.primary_key || null, [schema]);

    const safeRun = async (fn, successText = '') => {
        try {
            setLoading(true);
            setMessage('');
            const result = await fn();
            if (successText) setMessage(successText);
            return result;
        } catch (error) {
            const msg = error?.response?.data?.message || error.message || 'Operation failed';
            setMessage(msg);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const initialize = async () => {
        await safeRun(async () => {
            const [statusData, tableData] = await Promise.all([
                databaseService.getDatabaseStatus(),
                databaseService.listTables(),
            ]);

            setDbStatus(statusData);
            const tableNames = tableData?.tables || [];
            setTables(tableNames);
            if (tableNames.length) {
                setSelectedTable(tableNames[0]);
            }
        }, 'Database metadata loaded');
    };

    const loadTableData = async (tableName) => {
        await safeRun(async () => {
            const [schemaData, rowData] = await Promise.all([
                databaseService.getTableSchema(tableName),
                databaseService.getTableRows(tableName, { limit, offset, orderBy: orderBy || undefined, order }),
            ]);

            setSchema(schemaData);
            setRowsData(rowData);
        }, `Loaded table: ${tableName}`);
    };

    const reloadRows = async () => {
        if (!selectedTable) return;
        await safeRun(async () => {
            const rowData = await databaseService.getTableRows(selectedTable, {
                limit: Number(limit),
                offset: Number(offset),
                orderBy: orderBy || undefined,
                order,
            });
            setRowsData(rowData);
        }, 'Rows refreshed');
    };

    const handleInsert = async () => {
        if (!selectedTable) return;
        await safeRun(async () => {
            const payload = JSON.parse(insertJson || '{}');
            await databaseService.insertRow(selectedTable, payload);
            await reloadRows();
        }, 'Row inserted');
    };

    const handleUpdate = async () => {
        if (!selectedTable || !updateRowId) return;
        await safeRun(async () => {
            const payload = JSON.parse(updateJson || '{}');
            await databaseService.updateRow(selectedTable, updateRowId, payload);
            await reloadRows();
        }, 'Row updated');
    };

    const handleDelete = async () => {
        if (!selectedTable || !deleteRowId) return;
        await safeRun(async () => {
            await databaseService.deleteRow(selectedTable, deleteRowId);
            await reloadRows();
        }, 'Row deleted');
    };

    const handleExecuteSql = async () => {
        await safeRun(async () => {
            const replacements = JSON.parse(sqlReplacementsJson || '{}');
            const result = await databaseService.executeQuery(sql, replacements);
            setSqlResult(result);
        }, 'SQL executed');
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Database Explorer</h1>
                <button
                    onClick={initialize}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                    {loading ? 'Working...' : 'Refresh DB'}
                </button>
            </div>

            {message ? (
                <div className="px-4 py-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                    {message}
                </div>
            ) : null}

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border rounded-xl p-4">
                    <p className="text-sm text-gray-500">Database</p>
                    <p className="text-lg font-semibold mt-1">{dbStatus?.database || '-'}</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <p className="text-sm text-gray-500">Version</p>
                    <p className="text-sm font-semibold mt-1 break-all">{dbStatus?.version || '-'}</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <p className="text-sm text-gray-500">Threads</p>
                    <p className="text-lg font-semibold mt-1">{dbStatus?.server_status?.Threads_connected || '-'} connected</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <p className="text-sm text-gray-500">Tables</p>
                    <p className="text-lg font-semibold mt-1">{tables.length}</p>
                </div>
            </section>

            <section className="bg-white border rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold">Table Browser</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                    >
                        {tables.map((table) => (
                            <option key={table} value={table}>{table}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        min="1"
                        max="500"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                        placeholder="Limit"
                    />
                    <input
                        type="number"
                        min="0"
                        value={offset}
                        onChange={(e) => setOffset(e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                        placeholder="Offset"
                    />
                    <input
                        value={orderBy}
                        onChange={(e) => setOrderBy(e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                        placeholder="Order by column"
                    />
                    <select value={order} onChange={(e) => setOrder(e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="DESC">DESC</option>
                        <option value="ASC">ASC</option>
                    </select>
                </div>
                <button
                    onClick={reloadRows}
                    disabled={loading || !selectedTable}
                    className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-black disabled:opacity-60"
                >
                    Load Rows
                </button>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white border rounded-xl p-6 space-y-3">
                    <h2 className="text-xl font-semibold">Schema</h2>
                    <p className="text-sm text-gray-600">Primary Key: {primaryKey || 'None'}</p>
                    <div className="max-h-80 overflow-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left">Column</th>
                                    <th className="px-3 py-2 text-left">Type</th>
                                    <th className="px-3 py-2 text-left">Key</th>
                                    <th className="px-3 py-2 text-left">Nullable</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(schema?.columns || []).map((col) => (
                                    <tr key={col.column_name} className="border-t">
                                        <td className="px-3 py-2">{col.column_name}</td>
                                        <td className="px-3 py-2">{col.column_type}</td>
                                        <td className="px-3 py-2">{col.column_key || '-'}</td>
                                        <td className="px-3 py-2">{col.is_nullable}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white border rounded-xl p-6 space-y-3">
                    <h2 className="text-xl font-semibold">Rows</h2>
                    <p className="text-sm text-gray-600">
                        Total: {rowsData?.total ?? 0} | Showing: {(rowsData?.rows || []).length} | Offset: {rowsData?.offset ?? 0}
                    </p>
                    <div className="max-h-80 overflow-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    {(schema?.columns || []).slice(0, 8).map((col) => (
                                        <th key={col.column_name} className="px-3 py-2 text-left">{col.column_name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(rowsData?.rows || []).map((row, idx) => (
                                    <tr key={idx} className="border-t">
                                        {(schema?.columns || []).slice(0, 8).map((col) => (
                                            <td key={col.column_name} className="px-3 py-2 max-w-xs truncate">
                                                {row[col.column_name] === null || row[col.column_name] === undefined
                                                    ? 'NULL'
                                                    : String(row[col.column_name])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="bg-white border rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold">Row Operations</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <h3 className="font-medium">Insert Row (JSON)</h3>
                        <textarea
                            value={insertJson}
                            onChange={(e) => setInsertJson(e.target.value)}
                            className="w-full min-h-36 px-3 py-2 border rounded-lg font-mono text-sm"
                        />
                        <button
                            onClick={handleInsert}
                            disabled={loading || !selectedTable}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                        >
                            Insert
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">Update Row by ID</h3>
                        <input
                            placeholder={`Row ID (${primaryKey || 'primary key'})`}
                            value={updateRowId}
                            onChange={(e) => setUpdateRowId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <textarea
                            value={updateJson}
                            onChange={(e) => setUpdateJson(e.target.value)}
                            className="w-full min-h-28 px-3 py-2 border rounded-lg font-mono text-sm"
                        />
                        <button
                            onClick={handleUpdate}
                            disabled={loading || !selectedTable || !updateRowId}
                            className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                        >
                            Update
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">Delete Row by ID</h3>
                        <input
                            placeholder={`Row ID (${primaryKey || 'primary key'})`}
                            value={deleteRowId}
                            onChange={(e) => setDeleteRowId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <button
                            onClick={handleDelete}
                            disabled={loading || !selectedTable || !deleteRowId}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </section>

            <section className="bg-white border rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold">SQL Console (Admin)</h2>
                <textarea
                    value={sql}
                    onChange={(e) => setSql(e.target.value)}
                    className="w-full min-h-28 px-3 py-2 border rounded-lg font-mono text-sm"
                    placeholder="SELECT * FROM users LIMIT 20;"
                />
                <textarea
                    value={sqlReplacementsJson}
                    onChange={(e) => setSqlReplacementsJson(e.target.value)}
                    className="w-full min-h-20 px-3 py-2 border rounded-lg font-mono text-sm"
                    placeholder='{"id": 1}'
                />
                <button
                    onClick={handleExecuteSql}
                    disabled={loading || !sql.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800 disabled:opacity-60"
                >
                    Execute SQL
                </button>

                {sqlResult ? (
                    <div className="border rounded-lg p-4 bg-gray-50 overflow-auto">
                        <p className="text-sm text-gray-700 mb-2"><strong>Type:</strong> {sqlResult.queryType}</p>
                        <p className="text-sm text-gray-700 mb-2"><strong>Row Count:</strong> {sqlResult.rowCount}</p>
                        <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(sqlResult.result, null, 2)}</pre>
                    </div>
                ) : null}
            </section>
        </div>
    );
};

export default DatabaseExplorer;