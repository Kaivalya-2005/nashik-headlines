import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ArticleList from './pages/ArticleList';
import CreateArticle from './pages/CreateArticle';
import EditArticle from './pages/EditArticle';
import ManusControl from './pages/ManusControl';
import DatabaseExplorer from './pages/DatabaseExplorer';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/articles" element={<ArticleList />} />
              <Route path="/articles/create" element={<CreateArticle />} />
              <Route path="/articles/edit/:id" element={<EditArticle />} />

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/manus-control" element={<ManusControl />} />
                <Route path="/database" element={<DatabaseExplorer />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
