import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Rocket, RotateCcw, Copy, Trash2, ImagePlus, X, Wand2, ChevronDown, ChevronUp, RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as newsroomService from '../services/newsroomService';
import { calculateSeoScore } from '../utils/seoScore';
import aiService from '../api/aiService';
import articleService from '../api/articleService';

const VALID_CATEGORIES = [
  { slug: 'nashik', label: 'Nashik' },
  { slug: 'shirdi', label: 'Shirdi' },
  { slug: 'yeola', label: 'Yeola' },
  { slug: 'dhule', label: 'Dhule' },
  { slug: 'malegaon', label: 'Malegaon' },
  { slug: 'igatpuri', label: 'Igatpuri' },
  { slug: 'maharashtra', label: 'Maharashtra' },
  { slug: 'india', label: 'India' },
  { slug: 'international', label: 'International' },
  { slug: 'entertainment', label: 'Entertainment' },
  { slug: 'sports', label: 'Sports' },
  { slug: 'politics', label: 'Politics' },
  { slug: 'business', label: 'Business' },
  { slug: 'technology', label: 'Technology' },
  { slug: 'health', label: 'Health' },
  { slug: 'education', label: 'Education' },
  { slug: 'crime', label: 'Crime' },
];

const DEFAULT_PROMPT = `You are a senior English news editor and SEO specialist for nashikheadlines.com.

Write a clear, factual English news article in Google News-friendly style.

Topic:
[Write Topic Here]

Focus Keyphrase:
[Write Focus Keyphrase]

Mandatory Content Rules:
- Language must be English only.
- Article length must be 350-500 words.
- Use short paragraphs with clear markdown subheadings (H2/H3 style, e.g., ## Heading).
- Mention at least one local signal: Nashik, Maharashtra, or India.
- Include at least one internal link to another nashikheadlines.com article.
- Include at least one external credible source link.
- Keep tone journalistic, neutral, and readable.

SEO Checklist (must pass):
- SEO Title added.
- Meta Description length: 100-160 characters.
- Focus Keyphrase found in title.
- Article is 300+ words.
- Subheadings used (H2/H3).
- Feature Image Alt Text added.
- Internal Link present.
- External Source Link present.
- Smart URL slug added.
- Local signals found (Nashik, Maharashtra, India).

Return ONLY a valid JSON object (no markdown fences, no explanation) with exactly these keys:
{
  "title": "Article headline",
  "slug": "smart-url-slug-in-english-lowercase-hyphens",
  "metaDesc": "Meta description between 100 and 160 characters",
  "category": "Pick exactly ONE: Nashik, Maharashtra, India, International, Entertainment, Sports, Politics, Business, Technology, Health, Education, Crime",
  "content": "Full markdown news article with H2/H3 and links",
  "summary": "Short 2 sentence summary",
  "imageAlt": "English feature image alt text",
  "keywords": "SEO keywords separated by commas",
  "tags": "Relevant tags separated by commas"
}

Do not return any conversational text. Return only the JSON object.`;

// Custom hook for localStorage caching
function useLocalDraft(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  }, [key, value]);

  return [value, setValue];
}

const AIEditor = () => {
  // Base Fields
  const [topic, setTopic] = useLocalDraft('aiEdit_topic', '');
  const [focusKeyphrase, setFocusKeyphrase] = useLocalDraft('aiEdit_focusKeyphrase', '');
  const [title, setTitle] = useLocalDraft('aiEdit_title', '');
  const [content, setContent] = useLocalDraft('aiEdit_content', '');
  const [summary, setSummary] = useLocalDraft('aiEdit_summary', '');
  const [category, setCategory] = useLocalDraft('aiEdit_category', '');

  // SEO & Optimization Fields
  const [seoTitle, setSeoTitle] = useLocalDraft('aiEdit_seoTitle', '');
  const [metaDesc, setMetaDesc] = useLocalDraft('aiEdit_metaDesc', '');
  const [keywords, setKeywords] = useLocalDraft('aiEdit_keywords', '');
  const [tags, setTags] = useLocalDraft('aiEdit_tags', '');
  const [slug, setSlug] = useLocalDraft('aiEdit_slug', '');
  const [imageAlt, setImageAlt] = useLocalDraft('aiEdit_imageAlt', '');

  // Prompt Configuration
  const [showPromptConfig, setShowPromptConfig] = useState(false);
  const [promptTemplate, setPromptTemplate] = useLocalDraft('aiEdit_promptTemplate', DEFAULT_PROMPT);

  useEffect(() => {
    const current = String(promptTemplate || '');
    const legacyMarkers = [
      'Write a Marathi news article',
      'Language must be simple and clear Marathi',
      'Write a detailed Marathi news report',
      'Write a 2-sentence summary in Marathi',
    ];

    const hasMarathiWord = /\bmarathi\b|मराठी/i.test(current);
    const hasEnglishGuard = /Language must be English only\./i.test(current);
    const isLegacyMarathiPrompt = legacyMarkers.some((marker) => current.includes(marker)) || (hasMarathiWord && !hasEnglishGuard);
    if (isLegacyMarathiPrompt) {
      setPromptTemplate(DEFAULT_PROMPT);
      toast.success('AI prompt upgraded to English SEO checklist mode.');
    }
  }, [promptTemplate, setPromptTemplate]);

  // Images
  const [images, setImages] = useState([]);

  // States
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useLocalDraft('aiEdit_history', []);
  const [aiLoaders, setAiLoaders] = useState({});

  const maxImages = 4;

  const getSerializableImages = (list = []) =>
    (list || []).map((img, idx) => ({
      id: img?.id || `image-${idx}`,
      url: img?.url || img?.preview || '',
      preview: img?.preview || img?.url || '',
      altText: img?.altText || '',
      caption: img?.caption || '',
      isFeatured: Boolean(img?.isFeatured ?? idx === 0),
    })).filter((img) => img.url || img.preview);

  const getPersistableImages = (list = []) =>
    (list || [])
      .map((img, idx) => ({
        id: img?.id || `image-${idx}`,
        url: img?.url || '',
        altText: img?.altText || '',
        caption: img?.caption || '',
        isFeatured: Boolean(img?.isFeatured ?? idx === 0),
      }))
      .filter((img) => {
        const url = String(img.url || '').trim();
        return Boolean(url) && !url.startsWith('blob:') && !url.startsWith('data:');
      });

  const saveToHistory = () => {
    if (content.trim() || title.trim()) {
      setHistory([
        {
          id: Date.now(),
          title, content, summary, category, seoTitle, metaDesc, keywords, tags, slug, imageAlt,
          images: getSerializableImages(images),
          timestamp: new Date().toLocaleTimeString()
        },
        ...history,
      ].slice(0, 10)); // keep last 10 at the top
      toast.success('Snapshot saved to history');
    }
  };

  const restoreFromHistory = (snapshot) => {
    setTitle(snapshot.title);
    setContent(snapshot.content);
    setSummary(snapshot.summary);
    setCategory(snapshot.category);
    setSeoTitle(snapshot.seoTitle || '');
    setMetaDesc(snapshot.metaDesc || '');
    setKeywords(snapshot.keywords || '');
    setTags(snapshot.tags || '');
    setSlug(snapshot.slug || '');
    setImageAlt(snapshot.imageAlt || '');
    setImages(getSerializableImages(snapshot.images || []));
    toast.success('Restored from history');
  };

  const handleAction = async (status) => {
    if (!title.trim() || !content.trim()) {
      toast.error('Article Title and Content Body cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const localFileImages = (images || []).filter((img) => img?.file);
      const persistableImages = getPersistableImages(images);
      const featuredPersisted = persistableImages.find((img) => img.isFeatured) || persistableImages[0] || null;

      const created = await newsroomService.createArticle({
        title: (title || '').trim(),
        content: (content || '').trim(),
        summary: (summary || '').trim(),
        category: (category || '').trim(),
        seo_title: (seoTitle || '').trim(),
        meta_description: (metaDesc || '').trim(),
        slug: (slug || '').trim(),
        keywords: String(keywords || '').split(',').map(k => k.trim()).filter(Boolean).join(','),
        tags: String(tags || '').split(',').map(t => t.trim()).filter(Boolean).join(','),
        image_alt: (imageAlt || featuredPersisted?.altText || '').trim(),
        image_url: featuredPersisted?.url || '',
        images: persistableImages,
        status: status
      });

      if (created?.id && localFileImages.length > 0) {
        const formData = new FormData();
        localFileImages.forEach((img) => formData.append('images', img.file));
        const uploaded = await articleService.uploadImages(created.id, formData);
        const uploadedQueue = Array.isArray(uploaded) ? uploaded : [];
        let uploadIndex = 0;

        const mergedImages = (images || []).map((img, idx) => {
          if (!img?.file) {
            return {
              id: img?.id || `image-${idx}`,
              url: img?.url || '',
              altText: img?.altText || '',
              caption: img?.caption || '',
              isFeatured: Boolean(img?.isFeatured ?? idx === 0),
            };
          }

          const upImg = uploadedQueue[uploadIndex++] || {};
          return {
            id: upImg.id || img?.id || `image-${idx}`,
            url: upImg.url || upImg.secure_url || '',
            altText: img?.altText || upImg.altText || '',
            caption: img?.caption || upImg.caption || '',
            isFeatured: Boolean(img?.isFeatured ?? upImg.isFeatured ?? idx === 0),
          };
        }).filter((img) => {
          const url = String(img.url || '').trim();
          return Boolean(url) && !url.startsWith('blob:') && !url.startsWith('data:');
        });

        const featuredMerged = mergedImages.find((img) => img.isFeatured) || mergedImages[0] || null;

        await newsroomService.updateArticle(created.id, {
          title: (title || '').trim(),
          content: (content || '').trim(),
          summary: (summary || '').trim(),
          category: (category || '').trim(),
          seo_title: (seoTitle || '').trim(),
          meta_description: (metaDesc || '').trim(),
          slug: (slug || '').trim(),
          keywords: String(keywords || '').split(',').map(k => k.trim()).filter(Boolean).join(','),
          tags: String(tags || '').split(',').map(t => t.trim()).filter(Boolean).join(','),
          image_alt: (imageAlt || featuredMerged?.altText || '').trim(),
          image_url: featuredMerged?.url || '',
          images: mergedImages,
        });
      }

      toast.success(status === 'published' ? 'Article published successfully!' : 'Article saved to drafts');
      if (status === 'published') resetForm();
    } catch (error) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message;
      toast.error('Failed to save: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (window.confirm("Are you sure you want to clear all fields? This will delete your current draft.")) {
      setTopic(''); setFocusKeyphrase(''); setTitle(''); setContent(''); setSummary(''); setCategory('');
      setSeoTitle(''); setMetaDesc(''); setKeywords(''); setTags(''); setSlug(''); setImageAlt('');
      setImages([]);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > maxImages) {
      toast.error(`You can only upload up to ${maxImages} images.`);
      return;
    }
    const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file), altText: '', caption: '' }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const generateFullArticle = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a Topic to generate the article.');
      return;
    }

    // Save current state to history before overwriting everything
    if (title.trim() || content.trim()) saveToHistory();

    setAiLoaders({ all: true });
    try {
      const response = await aiService.generateArticle({
        prompt: promptTemplate,
        topic,
        focusKeyword: focusKeyphrase || topic
      });

      const text = response.response || '';

      let parsed = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0].trim());
        else parsed = JSON.parse(text.trim());
      } catch (err) {
        setContent(text);
        toast.error('AI output format issue. Extracted raw text to the Content box.');
      }

      if (parsed) {
        setTitle(parsed.title || `ब्रेकिंग न्यूझ: ${topic}`);
        setContent(parsed.content || '');
        setSummary(parsed.summary || '');
        setCategory(parsed.category || 'Nashik');
        setSeoTitle(parsed.title || parsed.seo_title || '');
        setMetaDesc(parsed.metaDesc || parsed.meta_description || '');
        setKeywords(Array.isArray(parsed.keywords) ? parsed.keywords.join(', ') : (parsed.keywords || ''));
        setTags(Array.isArray(parsed.tags) ? parsed.tags.join(', ') : (parsed.tags || parsed.keywords || ''));
        setSlug(parsed.slug || '');
        setImageAlt(parsed.imageAlt || '');
        toast.success("Full News Article smoothly generated and fields populated!");
      }
    } catch (err) {
      toast.error(err.message || 'Generation failed.');
    } finally {
      setAiLoaders({ all: false });
    }
  };

  // Field specific fallback simulators or micro-prompts
  const generateField = async (field, setter, promptHint) => {
    setAiLoaders(prev => ({ ...prev, [field]: true }));
    try {
      const baseText = topic || title || 'News Topic';
      const baseKey = focusKeyphrase || baseText;
      let promptSnippet = "";
      
      switch (field) {
        case 'title': promptSnippet = `Write a short, catchy English news headline about: "${baseText}". Include the focus keyphrase "${baseKey}" naturally. Return ONLY the exact title string without quotes or json.`; break;
        case 'content': promptSnippet = `Write a detailed English news report about: "${baseText}" with focus keyword "${baseKey}". Use markdown with H2/H3 subheadings, include one internal nashikheadlines.com link, one external source link, and mention Nashik, Maharashtra, or India. Return ONLY the content string.`; break;
        case 'summary': promptSnippet = `Write a 2-sentence summary in English for the news topic: "${baseText}". Return ONLY the summary string without quotes or json.`; break;
        case 'category': promptSnippet = `Suggest exactly one English news category for: "${baseText}" from exactly this list: Nashik, Maharashtra, India, International, Entertainment, Sports, Politics, Business, Technology, Health, Education, Crime. Return ONLY the category word(s) without quotes.`; break;
        case 'seoTitle': promptSnippet = `Write an SEO optimized English news title for: "${baseText}" (max 55 chars) and include "${baseKey}" naturally. Return ONLY the title string.`; break;
        case 'metaDesc': promptSnippet = `Write an SEO meta description in English between 100 and 160 characters for: "${baseText}". Return ONLY the description string.`; break;
        case 'keywords': promptSnippet = `List 5 to 10 comma-separated SEO keywords in English for: "${baseKey}", including Nashik and Maharashtra where relevant. Return ONLY the comma separated keywords string.`; break;
        case 'tags': promptSnippet = `Generate 8 to 15 relevant English tags for: "${baseText}" as a comma-separated list. Return ONLY the comma separated tags string.`; break;
        case 'slug': promptSnippet = `Create a URL-friendly slug using english letters, numbers, and hyphens only for the topic: "${baseText}". Return ONLY the slug, no spaces or quotes.`; break;
        case 'imageAlt': promptSnippet = `Write a short, descriptive English image alt text for an image representing: "${baseKey}". Return ONLY the alt text string.`; break;
      }
      
      promptSnippet += `\n\nReturn EXACTLY a JSON object in this format: { "result": "your generated text here" }`;

      const response = await aiService.generateArticle({
        prompt: promptSnippet,
        topic: baseText,
        focusKeyword: baseKey
      });

      const text = response.response || '';
      let extracted = text;
      
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          extracted = parsed.result || text;
        }
      } catch (e) {
        // ignore fallback to raw text
      }

      const finalText = extracted.trim().replace(/^"|"$/g, '');
      setter(finalText);
      toast.success(`${promptHint} successfully rewritten!`);
    } catch (err) {
      toast.error(err.message || `Failed to generate ${promptHint}`);
    } finally {
      setAiLoaders(prev => ({ ...prev, [field]: false }));
    }
  };

  const seoData = calculateSeoScore({ title, content, summary, seo_title: seoTitle, meta_description: metaDesc, slug, keywords: String(keywords).split(','), image_alt: imageAlt });
  const seoScore = seoData?.score || 0;
  const seoChecks = seoData?.checks || {};

  // Actionable SEO Checklist Items
  const checklistItems = [
    { key: 'seoTitlePresent', label: 'SEO Title added', fix: 'Add a title to the SEO Title field.' },
    { key: 'metaDescription', label: 'Meta Description length (100-160 chars)', fix: 'Write a description between 100-160 characters in the Meta Description field.' },
    { key: 'keywordInTitle', label: 'Focus Keyphrase found in Title', fix: 'Include your exact Focus Keyphrase in the Article Title or SEO Title.' },
    { key: 'contentLength', label: 'Article is long enough (300+ words)', fix: 'AI needs to generate a longer article. Use the Wand tool.' },
    { key: 'headings', label: 'Subheadings used (H2, H3)', fix: 'Content needs ## Subheadings for readability.' },
    { key: 'imageAlt', label: 'Feature Image Alt Text added', fix: 'Add descriptive text to the Feature Image Alt Text box.' },
    { key: 'internalLinks', label: 'Internal Link present', fix: 'Add a link to another nashikheadlines.com article in the Content box.' },
    { key: 'externalLinks', label: 'External Source Link present', fix: 'Add a link to a credible outside source (like Twitter or Govt website) in the Content box.' },
    { key: 'slugPresent', label: 'Smart URL Slug added', fix: 'Generate a short Smart Slug in the SEO sidebar.' },
    { key: 'locationSignals', label: 'Local signals found (Nashik, Maharashtra)', fix: 'The article must mention Nashik, Maharashtra, or India.' },
  ];

  // Helper macro for common field label with AI button
  const FieldLabel = ({ label, fieldKey, setter }) => (
    <div className="flex justify-between items-center mb-1.5">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <button 
        onClick={() => generateField(fieldKey, setter, label)} 
        disabled={aiLoaders[fieldKey]}
        title={`Click to ask AI to auto-fill the ${label}`}
        className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold transition-all disabled:opacity-50"
      >
        {aiLoaders[fieldKey] ? <RefreshCcw size={13} className="animate-spin" /> : <Wand2 size={13} />} 
        Auto-Write
      </button>
    </div>
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            AI News Writer
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Just type a Topic and hit 'Generate All' — the AI handles the rest.
            <span className="ml-3 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Auto-Saving Enabled</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleAction('draft')}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-5 py-2.5 lg:px-6 lg:py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors border border-slate-300 dark:border-slate-700"
          >
            <Save size={18} />
            Save Draft
          </button>
          <button
            onClick={() => handleAction('published')}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-5 py-2.5 lg:px-6 lg:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors shadow-md"
          >
            <Rocket size={18} />
            Publish Now
          </button>
          <button
            onClick={resetForm}
            className="flex items-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl transition-colors border border-red-200 dark:border-red-900/50"
            title="Start fresh and clear all fields"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="xl:col-span-3 space-y-6">

          {/* Top Generator Box */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-indigo-500/5 dark:from-indigo-900/30 dark:to-purple-900/20 rounded-2xl p-6 md:p-8 border border-indigo-200 dark:border-indigo-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles size={120} />
            </div>
            
            <label className="block text-2xl font-bold text-indigo-900 dark:text-indigo-200 mb-2">
              Step 1: Instantly Write a Full Article
            </label>
            <p className="text-indigo-700 dark:text-indigo-300 mb-6 font-medium">Provide a short news topic and a key phrase you want Google to notice.</p>
            
            <div className="flex flex-col md:flex-row gap-4 relative z-10">
              <div className="flex-1">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateFullArticle(); }}
                  placeholder="News Topic (e.g. Police raid in Nashik)"
                  className="w-full px-5 py-3.5 border-2 border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all font-medium text-lg placeholder-slate-400"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={focusKeyphrase}
                  onChange={(e) => setFocusKeyphrase(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateFullArticle(); }}
                  placeholder="Focus Phrase (e.g. nashik online scam)"
                  className="w-full px-5 py-3.5 border-2 border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all font-medium text-lg placeholder-slate-400"
                />
              </div>
              <button
                onClick={generateFullArticle}
                disabled={aiLoaders.all || !topic.trim()}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-indigo-500/30 whitespace-nowrap"
              >
                {aiLoaders.all ? <div className="animate-spin"><RefreshCcw size={22} /></div> : <Sparkles size={22} />}
                Generate All Fields
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">Step 2: Review & Edit the Article</h2>
            
            {/* Title */}
            <div>
              <FieldLabel label="Article Headline (Title)" fieldKey="title" setter={setTitle} />
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wait for AI to write, or type here..." className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all font-semibold" />
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel label="Full Article Story (Content)" fieldKey="content" setter={setContent} />
                <div className="flex items-center gap-2">
                  <button onClick={() => copyToClipboard(content)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300 text-xs font-semibold" title="Copy to clipboard">
                    <Copy size={14} /> Copy Story
                  </button>
                </div>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="The full Marathi news story will appear here..." rows={14} className="w-full px-4 py-4 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all resize-y font-sans leading-relaxed text-[15px]" />
            </div>

            {/* Summary */}
            <div>
              <FieldLabel label="Short Summary (2 Sentences)" fieldKey="summary" setter={setSummary} />
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A brief wrap-up of the news..." rows={3} className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all resize-y" />
            </div>
          </div>

          {/* Media / Images */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 md:p-8 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3"><ImagePlus size={22} className="text-indigo-500" /> Upload Primary Photos ({images.length}/{maxImages})</h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <img src={img.preview} alt={img.altText || `upload-${idx}`} className="object-cover w-full h-full" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => removeImage(idx)} className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transform hover:scale-110 transition-transform">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {images.length < maxImages && (
                <label className="border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl aspect-video flex flex-col items-center justify-center text-indigo-500 dark:text-indigo-400 cursor-pointer transition-colors bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 group">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <ImagePlus size={28} className="mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold">Click to Upload Image</span>
                </label>
              )}
            </div>

            {/* Per-image caption + alt text cards */}
            {images.length > 0 && (
              <div className="space-y-4 mt-2">
                {images.map((img, idx) => {
                  const altLen = (img.altText || '').length;
                  const altGood = altLen >= 50 && altLen <= 125;
                  const altMissing = !img.altText?.trim();
                  return (
                    <div key={idx} className={`border rounded-xl p-4 bg-slate-50 dark:bg-slate-950 relative shadow-sm transition-colors ${altMissing ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                          <img
                            src={img.preview}
                            alt={img.altText || `Image ${idx + 1}`}
                            className="w-28 h-28 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900"
                          />
                          <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-1 font-medium">Image {idx + 1}</p>
                        </div>

                        {/* Fields */}
                        <div className="flex-grow space-y-3">
                          {/* Caption */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                              Caption <span className="text-slate-400 font-normal normal-case">(optional)</span>
                            </label>
                            <input
                              type="text"
                              value={img.caption || ''}
                              onChange={(e) => setImages(prev => prev.map((im, i) => i === idx ? { ...im, caption: e.target.value } : im))}
                              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors outline-none"
                              placeholder="प्रतिमेसाठी मथळा... (optional)"
                            />
                          </div>

                          {/* Alt Text */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`block text-xs font-semibold uppercase tracking-wide ${altMissing ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                Alt Text (SEO) <span className="text-red-500">*</span>
                                {altLen > 0 && (
                                  <span className={`ml-2 font-normal normal-case ${altGood ? 'text-green-500' : 'text-slate-400'}`}>
                                    {altLen} chars {altGood ? '✓' : '(50–125 recommended)'}
                                  </span>
                                )}
                              </label>
                            </div>
                            <input
                              type="text"
                              value={img.altText || ''}
                              onChange={(e) => setImages(prev => prev.map((im, i) => i === idx ? { ...im, altText: e.target.value } : im))}
                              className={`w-full text-sm px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors outline-none ${altMissing ? 'border-amber-400 dark:border-amber-600' : 'border-slate-300 dark:border-slate-700'}`}
                              placeholder="प्रतिमेचे वर्णन करा... (SEO साठी आवश्यक)"
                            />
                            {altMissing && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                ⚠️ Alt text improves SEO — please add a short image description
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Prompt Engine Box (Hidden to the bottom for Non-Tech users) */}
          <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div
              className="p-4 flex justify-between items-center cursor-pointer select-none opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => setShowPromptConfig(!showPromptConfig)}
            >
              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 text-sm">
                Advanced Setting: Modify the AI System Instructions (For Tech Admins only)
              </div>
              {showPromptConfig ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
            </div>
            {showPromptConfig && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <p className="text-xs text-slate-500 mb-3">WARNING: Only edit this if you understand AI System Prompts. Changes save instantly.</p>
                <textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  className="w-full h-[400px] p-4 text-xs font-mono bg-slate-900 text-emerald-400 rounded-lg border-2 border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-y"
                />
              </div>
            )}
          </div>

        </div>

        {/* Sidebar - SEO & Meta */}
        <div className="space-y-6">

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Score Header */}
            <div className={`p-6 border-b ${seoScore >= 80 ? 'bg-green-600 border-green-700' : seoScore >= 50 ? 'bg-amber-500 border-amber-600' : 'bg-red-500 border-red-600'}`}>
               <h3 className="font-bold text-white mb-1 flex items-center justify-between text-lg">
                Google Rank Score
                <span className="text-2xl tracking-tight">{seoScore}<span className="text-sm opacity-80 font-normal">/100</span></span>
              </h3>
              <p className="text-white/80 text-sm font-medium">
                {seoScore >= 80 ? 'Excellent! Ready for Google Search.' : seoScore >= 50 ? 'Needs slight improvements.' : 'Fix the red marks below to rank higher.'}
              </p>
            </div>

            <div className="p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900">
              <div>
                <FieldLabel label="Category Label" fieldKey="category" setter={setCategory} />
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full p-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select a Category...</option>
                  {VALID_CATEGORIES.map(cat => (
                    <option key={cat.slug} value={cat.label}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel label="Google Search Title" fieldKey="seoTitle" setter={setSeoTitle} />
                <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Max 55 characters..." className="w-full p-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
              </div>

              <div>
                <FieldLabel label="Google Meta Description" fieldKey="metaDesc" setter={setMetaDesc} />
                <textarea rows={4} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Short Google description (100-160 chars)..." className="w-full p-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all resize-none" />
              </div>

              <div>
                <FieldLabel label="Search Keywords" fieldKey="keywords" setter={setKeywords} />
                <textarea rows={2} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="comma, separated" className="w-full p-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all resize-none" />
              </div>

              <div>
                <FieldLabel label="Tags" fieldKey="tags" setter={setTags} />
                <textarea rows={2} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="news tags, comma separated" className="w-full p-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all resize-none" />
              </div>

              <div>
                <FieldLabel label="URL Web Link (Slug)" fieldKey="slug" setter={setSlug} />
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="url-friendly-slug-with-hyphens" className="w-full p-2.5 text-sm font-mono border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
              </div>
            </div>

            {/* Live SEO Checklist Guide */}
            <div className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-6">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] mb-4">SEO Checklist</h4>
              <ul className="space-y-3">
                {checklistItems.map((item) => {
                  const passed = seoChecks[item.key];
                  return (
                    <li key={item.key} className="flex items-start gap-2.5">
                      {passed ? (
                        <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-semibold ${passed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                          {item.label}
                        </p>
                        {!passed && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-relaxed mt-0.5 pr-2">
                            Fix: {item.fix}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Action Box Extra */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-[15px] font-bold text-slate-800 dark:text-slate-200 mb-4">
              <RotateCcw size={18} className="text-indigo-500" /> Version History
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium leading-relaxed">If you want to try multiple AI styles, save a snapshot first. You can always revert back exactly to it by clicking below.</p>
            <button onClick={saveToHistory} disabled={!content.trim()} className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-sm font-bold mb-4 transition-colors">
              Save Current as Snapshot
            </button>
            {history.length > 0 ? (
              <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
                {history.map((snap) => (
                  <div key={snap.id} onClick={() => restoreFromHistory(snap)} className="text-xs p-3 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all text-slate-700 dark:text-slate-300 group shadow-sm">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{snap.title || 'Untitled'}</p>
                    <p className="text-slate-500 opacity-80 font-medium">{snap.timestamp}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic text-center py-2">No snapshots saved yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEditor;
