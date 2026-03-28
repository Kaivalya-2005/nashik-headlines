import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ArticleTable from '../components/ArticleTable';

const ArticlesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const toastShownRef = useRef(false);

  useEffect(() => {
    if (location.state?.saved && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success("Article saved successfully");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-slate-50 dark:bg-slate-950 transition-colors min-h-screen">
      <ArticleTable refreshTrigger={0} />
    </div>
  );
};

export default ArticlesPage;
