/**
 * App — main application entry point with admin routes.
 */

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const HomePage = lazy(() => import("@/pages/HomePage"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const ArticlePage = lazy(() => import("@/pages/ArticlePage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const BookmarksPage = lazy(() => import("@/pages/BookmarksPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AdminArticleForm = lazy(() => import("@/pages/AdminArticleForm"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/article/:id" element={<ArticlePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/bookmarks" element={<BookmarksPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/new" element={<AdminArticleForm />} />
                <Route path="/admin/edit/:id" element={<AdminArticleForm />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
