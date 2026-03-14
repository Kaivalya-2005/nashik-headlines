/**
 * AdminArticleForm — create or edit an article.
 * Handles image upload to storage and article CRUD.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { CATEGORIES } from "@/types/news";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Upload, Image as ImageIcon } from "lucide-react";
import SEOHead from "@/components/SEOHead";

interface ArticleFormData {
  title: string;
  summary: string;
  content: string;
  image_url: string;
  category: string;
  location: string;
  author: string;
  is_breaking: boolean;
  is_published: boolean;
}

const defaultForm: ArticleFormData = {
  title: "",
  summary: "",
  content: "",
  image_url: "",
  category: "nashik",
  location: "",
  author: "Staff Reporter",
  is_breaking: false,
  is_published: false,
};

export default function AdminArticleForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { isAdmin, loading: authLoading, userId } = useAdmin();
  const navigate = useNavigate();
  const [form, setForm] = useState<ArticleFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !isAdmin) return;
    (async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Article not found");
        navigate("/admin");
        return;
      }

      setForm({
        title: data.title,
        summary: data.summary,
        content: data.content,
        image_url: data.image_url || "",
        category: data.category,
        location: data.location || "",
        author: data.author,
        is_breaking: data.is_breaking,
        is_published: data.is_published,
      });
      setLoadingArticle(false);
    })();
  }, [id, isEdit, isAdmin, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload image: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("article-images")
      .getPublicUrl(fileName);

    setForm((prev) => ({ ...prev, image_url: publicUrl }));
    toast.success("Image uploaded");
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    const wordCount = form.content.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Auto-generate slug from title
    const slug = form.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 120);

    const articleData = {
      title: form.title.trim(),
      slug,
      summary: form.summary.trim(),
      content: form.content.trim(),
      image_url: form.image_url,
      category: form.category,
      location: form.location.trim(),
      author: form.author.trim() || "Staff Reporter",
      is_breaking: form.is_breaking,
      is_published: form.is_published,
      read_time: readTime,
      ...(isEdit ? { updated_at: new Date().toISOString() } : { created_by: userId }),
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("articles").update(articleData).eq("id", id));
    } else {
      ({ error } = await supabase.from("articles").insert(articleData));
    }

    if (error) {
      toast.error("Failed to save: " + error.message);
      setSaving(false);
      return;
    }

    toast.success(isEdit ? "Article updated!" : "Article created!");
    navigate("/admin");
    setSaving(false);
  };

  if (authLoading || loadingArticle) {
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

  return (
    <>
      <SEOHead title={isEdit ? "Edit Article" : "New Article"} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <button
          onClick={() => navigate("/admin")}
          className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </button>

        <h1 className="font-headline font-bold text-display mb-8">
          {isEdit ? "Edit Article" : "New Article"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Enter article headline"
              required
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              placeholder="Brief summary (1-2 lines)"
              rows={2}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Full article content. Use blank lines to separate paragraphs."
              rows={12}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Featured Image</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
                <Upload size={16} />
                <span className="text-sm">{uploading ? "Uploading..." : "Upload Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <span className="text-sm text-muted-foreground">or</span>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="Paste image URL"
                className="flex-1"
              />
            </div>
            {form.image_url && (
              <div className="mt-3 relative rounded-lg overflow-hidden border border-border">
                <img src={form.image_url} alt="Preview" className="w-full h-48 object-cover" />
                <div className="absolute top-2 right-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setForm((p) => ({ ...p, image_url: "" }))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Nashik, Maharashtra"
              />
            </div>
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={form.author}
              onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
              placeholder="Author name"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-8 p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))}
              />
              <Label className="cursor-pointer">Publish immediately</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_breaking}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_breaking: v }))}
              />
              <Label className="cursor-pointer">Breaking News</Label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" disabled={saving} className="min-w-[140px]">
              {saving ? "Saving..." : isEdit ? "Update Article" : "Create Article"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/admin")}>
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </>
  );
}
