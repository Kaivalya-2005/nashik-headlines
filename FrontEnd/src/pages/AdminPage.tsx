/**
 * AdminPage — article management dashboard.
 * Lists all articles with create, edit, delete, and publish controls.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, EyeOff, Zap, LogOut } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { CATEGORIES } from "@/types/news";

interface DBArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  is_published: boolean;
  is_breaking: boolean;
  views: number;
  published_at: string;
  author: string;
}

export default function AdminPage() {
  const { isAdmin, loading, signOut } = useAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, category, is_published, is_breaking, views, published_at, author")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DBArticle[];
    },
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      toast.success("Article deleted");
    },
    onError: () => toast.error("Failed to delete article"),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("articles").update({ is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      toast.success("Article updated");
    },
    onError: () => toast.error("Failed to update article"),
  });

  const toggleBreakingMutation = useMutation({
    mutationFn: async ({ id, is_breaking }: { id: string; is_breaking: boolean }) => {
      const { error } = await supabase.from("articles").update({ is_breaking }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      toast.success("Breaking status updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-20 text-center">
        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-accent rounded-full animate-spin mx-auto" />
      </main>
    );
  }

  if (!isAdmin) {
    navigate("/login");
    return null;
  }

  const filteredArticles = articles.filter((a) => {
    if (filter === "published") return a.is_published;
    if (filter === "draft") return !a.is_published;
    return true;
  });

  return (
    <>
      <SEOHead title="Admin Dashboard" />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline font-bold text-display">Dashboard</h1>
            <p className="text-muted-foreground">{articles.length} total articles</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/admin/new")} className="gap-2">
              <Plus size={16} />
              New Article
            </Button>
            <Button variant="outline" onClick={() => { signOut(); navigate("/"); }} className="gap-2">
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["all", "published", "draft"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-10">Loading articles...</p>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No articles found.</p>
            <Button onClick={() => navigate("/admin/new")}>Create your first article</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((article) => {
              const catInfo = CATEGORIES.find((c) => c.slug === article.category);
              return (
                <div
                  key={article.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {catInfo && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {catInfo.label}
                        </Badge>
                      )}
                      {article.is_published ? (
                        <Badge className="bg-green-500/10 text-green-600 text-xs">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Draft</Badge>
                      )}
                      {article.is_breaking && (
                        <Badge className="bg-accent/10 text-accent text-xs">Breaking</Badge>
                      )}
                    </div>
                    <h3 className="font-headline font-semibold text-sm line-clamp-1">{article.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {article.author} · {article.views} views · {new Date(article.published_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBreakingMutation.mutate({ id: article.id, is_breaking: !article.is_breaking })}
                      title={article.is_breaking ? "Remove breaking" : "Mark as breaking"}
                    >
                      <Zap size={14} className={article.is_breaking ? "text-accent" : "text-muted-foreground"} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublishMutation.mutate({ id: article.id, is_published: !article.is_published })}
                      title={article.is_published ? "Unpublish" : "Publish"}
                    >
                      {article.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/edit/${article.id}`)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this article?")) {
                          deleteMutation.mutate(article.id);
                        }
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
