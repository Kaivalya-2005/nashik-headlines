import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ArticlesPage from './pages/ArticlesPage';
import CreateArticle from './pages/CreateArticle';
import EditArticle from './pages/EditArticle';
import AIEditor from './pages/AIEditor';
import RawArticlesPipeline from './pages/RawArticlesPipeline';

function App() {
  return (
    <Router>
      <AuthProvider>
        <DarkModeProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/articles" element={<ArticlesPage />} />
                <Route path="/articles/create" element={<CreateArticle />} />
                <Route path="/articles/edit/:id" element={<EditArticle />} />
                <Route path="/ai-editor" element={<AIEditor />} />
                <Route path="/pipeline" element={<RawArticlesPipeline />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DarkModeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
