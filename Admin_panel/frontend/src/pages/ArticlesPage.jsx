import React from 'react';
import ArticleTable from '../components/ArticleTable';

const ArticlesPage = () => {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 transition-colors min-h-screen">
      <ArticleTable refreshTrigger={0} />
    </div>
  );
};

export default ArticlesPage;
