import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Rocket, RotateCcw, Copy, Trash2, ImagePlus, X, Wand2, ChevronDown, ChevronUp, RefreshCcw, CheckCircle, XCircle, Globe, MapPin, ChevronRight, Link } from 'lucide-react';
import toast from 'react-hot-toast';
import * as newsroomService from '../services/newsroomService';
import { calculateSeoScore } from '../utils/seoScore';
import aiService from '../api/aiService';
import articleService from '../api/articleService';
import api from '../api/api';

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

MANDATORY YOAST SEO RULES (ALL 15 must pass — no exceptions):

1. INTERNAL LINKS: Include at least one link to nashikheadlines.com within the article content.
2. KEYPHRASE IN INTRODUCTION: The focus keyphrase MUST appear in the very first paragraph of the article.
3. KEYPHRASE IN META DESCRIPTION: The meta description MUST contain the focus keyphrase or its synonym.
4. KEYPHRASE IN SUBHEADINGS: At least one H2 or H3 subheading MUST contain the focus keyphrase or its main word.
5. KEYPHRASE IN IMAGE ALT: The image alt text MUST contain at least half the words from the focus keyphrase.
6. KEYPHRASE IN SLUG: The URL slug MUST contain all words from the focus keyphrase (hyphenated).
7. OUTBOUND LINKS: Include at least one link to a credible external source.
8. IMAGES: Set a descriptive image alt text.
9. KEYPHRASE DENSITY: Use the focus keyphrase 1-3% of the time (every ~50 words in a 600-word article = ~8-12 times).
10. KEYPHRASE IN SEO TITLE: The SEO title MUST begin with the focus keyphrase.
11. KEYPHRASE LENGTH: Focus keyphrase must be 2-4 words.
12. META DESCRIPTION LENGTH: Meta description must be 120-155 characters.
13. PREVIOUSLY USED: Use a unique keyphrase (auto-pass).
14. SINGLE TITLE: Do NOT include any <h1> tags in the article body — only use <h2> and <h3>.
15. COMPETING LINKS: Do not use the keyphrase as anchor text in external links (auto-pass).

Content Requirements:
- Language must be English only.
- Article length MUST be 600-700 words minimum. Do NOT stop before 600 words.
- Use at least 4 HTML subheadings: <h2>Heading</h2>, <h3>Sub</h3>. Do NOT use markdown ##.
- Mention Nashik, Maharashtra, or India naturally.
- Keep tone journalistic, neutral, and readable.
- Each section should have 2-3 detailed paragraphs.

Return ONLY a valid JSON object (no markdown fences, no explanation) with exactly these keys:
{
  "title": "Article headline starting with focus keyphrase",
  "slug": "focus-keyphrase-words-in-slug",
  "metaDesc": "Meta description 120-155 chars containing focus keyphrase",
  "category": "Pick exactly ONE: Nashik, Maharashtra, India, International, Entertainment, Sports, Politics, Business, Technology, Health, Education, Crime",
  "content": "Full HTML article (h2/h3 tags, anchor tags, no h1 in body) — 600+ words",
  "summary": "Short 2 sentence summary",
  "imageAlt": "Image alt text containing focus keyphrase words (50-120 chars)",
  "keywords": "SEO keywords separated by commas",
  "tags": "Relevant tags separated by commas"
}

Do not return any conversational text. Return only the JSON object.`;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML tags and count words (same logic as Yoast). */
function countWordsFromHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

/** Persist a published article to localStorage so it never needs re-generation. */
function cachePublishedArticle(payload) {
  try {
    const key = `wp_cache_${payload.slug || payload.title?.slice(0,30) || Date.now()}`;
    localStorage.setItem(key, JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }));
    return key;
  } catch (e) {
    console.warn('Cache write failed:', e);
    return null;
  }
}

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
  // Publish Target
  const [publishTarget, setPublishTarget] = useLocalDraft('aiEdit_publishTarget', 'nashik');

  // Base Fields
  const [topic, setTopic] = useLocalDraft('aiEdit_topic', '');
  const [sourceUrl, setSourceUrl] = useLocalDraft('aiEdit_sourceUrl', '');
  const [focusKeyphrase, setFocusKeyphrase] = useLocalDraft('aiEdit_focusKeyphrase', '');
  const [title, setTitle] = useLocalDraft('aiEdit_title', '');
  const [content, setContent] = useLocalDraft('aiEdit_content', '');
  const [summary, setSummary] = useLocalDraft('aiEdit_summary', '');
  const [excerpt, setExcerpt] = useLocalDraft('aiEdit_excerpt', '');
  const [category, setCategory] = useLocalDraft('aiEdit_category', '');
  const [language, setLanguage] = useLocalDraft('aiEdit_language', 'mr');
  const [format, setFormat] = useLocalDraft('aiEdit_format', 'standard');
  const [sticky, setSticky] = useLocalDraft('aiEdit_sticky', false);
  const [city, setCity] = useLocalDraft('aiEdit_city', 'nashik');
  const [region, setRegion] = useLocalDraft('aiEdit_region', 'maharashtra');
  const [authorName, setAuthorName] = useLocalDraft('aiEdit_authorName', '');
  const [byline, setByline] = useLocalDraft('aiEdit_byline', '');

  // SEO & Optimization Fields
  const [seoTitle, setSeoTitle] = useLocalDraft('aiEdit_seoTitle', '');
  const [metaDesc, setMetaDesc] = useLocalDraft('aiEdit_metaDesc', '');
  const [keywords, setKeywords] = useLocalDraft('aiEdit_keywords', '');
  const [tags, setTags] = useLocalDraft('aiEdit_tags', '');
  const [slug, setSlug] = useLocalDraft('aiEdit_slug', '');
  const [imageAlt, setImageAlt] = useLocalDraft('aiEdit_imageAlt', '');
  const [focusKeyword, setFocusKeyword] = useLocalDraft('aiEdit_focusKeyword', '');
  const [canonicalUrl, setCanonicalUrl] = useLocalDraft('aiEdit_canonicalUrl', '');

  // Social / OG Fields
  const [ogTitle, setOgTitle] = useLocalDraft('aiEdit_ogTitle', '');
  const [ogDesc, setOgDesc] = useLocalDraft('aiEdit_ogDesc', '');
  const [twitterTitle, setTwitterTitle] = useLocalDraft('aiEdit_twitterTitle', '');
  const [twitterDesc, setTwitterDesc] = useLocalDraft('aiEdit_twitterDesc', '');

  // UI toggles
  const [showSocial, setShowSocial] = useState(false);
  const [showAdvancedSeo, setShowAdvancedSeo] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);

  // Prompt Configuration
  const [showPromptConfig, setShowPromptConfig] = useState(false);
  const [promptTemplate, setPromptTemplate] = useLocalDraft('aiEdit_promptTemplate', DEFAULT_PROMPT);

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

  const buildArticlePayload = (status, featuredImage, articleImages = []) => ({
    title:               (title || '').trim(),
    content:             (content || '').trim(),
    summary:             (summary || '').trim(),
    excerpt:             (excerpt || '').trim(),
    category:            (category || '').trim(),
    language:            language || 'mr',
    format:              format || 'standard',
    sticky:              Boolean(sticky),
    city:                city || 'nashik',
    region:              region || 'maharashtra',
    author_name:         (authorName || '').trim(),
    byline:              (byline || '').trim(),
    source_url:          (sourceUrl || '').trim(),
    seo_title:           (seoTitle || '').trim(),
    meta_description:    (metaDesc || '').trim(),
    focus_keyword:       (focusKeyword || focusKeyphrase || '').trim(),
    slug:                (slug || '').trim(),
    keywords:            String(keywords || '').split(',').map(k => k.trim()).filter(Boolean).join(','),
    tags:                String(tags || '').split(',').map(t => t.trim()).filter(Boolean).join(','),
    image_alt:           (imageAlt || featuredImage?.altText || '').trim(),
    image_url:           featuredImage?.url || '',
    featured_image_url:  featuredImage?.url || '',
    featured_image_alt:  (imageAlt || featuredImage?.altText || '').trim(),
    og_title:            (ogTitle || seoTitle || title || '').trim(),
    og_description:      (ogDesc || metaDesc || '').trim(),
    og_image:            featuredImage?.url || '',
    twitter_title:       (twitterTitle || seoTitle || title || '').trim(),
    twitter_description: (twitterDesc || metaDesc || '').trim(),
    canonical_url:       (canonicalUrl || '').trim(),
    publish_to:          publishTarget,
    status,
    images:              articleImages,
  });

  /** Upload local files to WordPress media, merge with existing public URLs */
  const resolveImagesForPublish = async (imageList = []) => {
    const localFiles = (imageList || []).filter((img) => img?.file);
    let uploadedQueue = [];

    if (localFiles.length > 0) {
      const uploadToast = toast.loading('Uploading images to WordPress...');
      try {
        const metaList = localFiles.map((img) => {
          const idx = (imageList || []).indexOf(img);
          return {
            altText: img.altText || '',
            caption: img.caption || '',
            isFeatured: Boolean(img.isFeatured ?? idx === 0),
          };
        });
        uploadedQueue = await newsroomService.uploadPublishImages(
          localFiles.map((img) => img.file),
          metaList
        );
      } finally {
        toast.dismiss(uploadToast);
      }
    }

    let uploadIdx = 0;
    return (imageList || [])
      .map((img, idx) => {
        if (img?.file) {
          const up = uploadedQueue[uploadIdx++] || {};
          const url = up.url || '';
          if (!url) return null;
          return {
            id: up.id || `image-${idx}`,
            url,
            mediaId: up.mediaId || up.id,
            altText: img.altText || up.altText || '',
            caption: img.caption || up.caption || '',
            isFeatured: Boolean(img.isFeatured ?? idx === 0),
          };
        }
        const url = String(img?.url || '').trim();
        if (!url || url.startsWith('blob:') || url.startsWith('data:')) return null;
        return {
          id: img?.id || `image-${idx}`,
          url,
          altText: img.altText || '',
          caption: img.caption || '',
          isFeatured: Boolean(img.isFeatured ?? idx === 0),
        };
      })
      .filter(Boolean);
  };

  const handleAction = async (status) => {
    if (!title.trim() || !content.trim()) {
      toast.error('Article Title and Content Body cannot be empty.');
      return;
    }

    // Navi Mumbai Only — ALWAYS WordPress draft (never live publish), NO local DB
    if (publishTarget === 'navimumbai') {
      const confirmed = window.confirm(
        'Save to Navi Mumbai Headlines (WordPress) as a draft?\n\n' +
        '• All AI-filled fields will be sent to WordPress\n' +
        '• Up to 4 images will be placed inside the article\n' +
        '• Yoast SEO meta will be set\n' +
        '• Nothing will be saved in the local database\n\nContinue?'
      );
      if (!confirmed) return;
      setSaving(true);
      try {
        const resolvedImages = await resolveImagesForPublish(images);
        const featuredImage = resolvedImages.find((i) => i.isFeatured) || resolvedImages[0] || null;
        const payload = buildArticlePayload('draft', featuredImage, resolvedImages);
        const result = await newsroomService.publishDirectToWordPress(payload);

        // ── Cache all fields locally after successful WP upload ──
        const cacheKey = cachePublishedArticle(payload);
        if (cacheKey) toast.success('📦 Article cached locally — no re-generation needed', { duration: 3000 });

        toast.success(
          `WordPress draft saved! ${result.url ? `Edit in WP: ${result.url}` : ''}`,
          { duration: 8000 }
        );
        resetForm(true);
      } catch (err) {
        toast.error('WP draft failed: ' + (err?.response?.data?.error || err.message));
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const localFileImages = (images || []).filter((img) => img?.file);
      const persistableImages = getPersistableImages(images);
      const featuredPersisted = persistableImages.find((img) => img.isFeatured) || persistableImages[0] || null;
      const payload = buildArticlePayload(status, featuredPersisted);

      const created = await newsroomService.createArticle({ ...payload, images: persistableImages });

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

      // If 'both', trigger WP publish after DB save
      if (publishTarget === 'both' && status === 'published' && created?.id) {
        try {
          const wpResult = await newsroomService.publishArticleWithTarget(created.id, 'both');
          toast.success('Published to Nashik + Navi Mumbai Headlines! 🚀');
        } catch (wpErr) {
          toast.success('Saved to Nashik DB but Navi Mumbai WP publish failed: ' + (wpErr?.response?.data?.error || wpErr.message));
        }
      } else {
        toast.success(status === 'published' ? 'Article published to Nashik Headlines!' : 'Draft saved ✅');
      }
      if (status === 'published') resetForm(true);
    } catch (error) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error.message;
      toast.error('Failed to save: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = (skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('Clear all fields? Your current draft will be deleted.')) return;
    setTopic(''); setSourceUrl(''); setFocusKeyphrase(''); setTitle(''); setContent('');
    setSummary(''); setExcerpt(''); setCategory(''); setAuthorName(''); setByline('');
    setSeoTitle(''); setMetaDesc(''); setKeywords(''); setTags(''); setSlug('');
    setImageAlt(''); setFocusKeyword(''); setCanonicalUrl('');
    setOgTitle(''); setOgDesc(''); setTwitterTitle(''); setTwitterDesc('');
    setImages([]);
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
    if (title.trim() || content.trim()) saveToHistory();
    setAiLoaders({ all: true });
    const toastId = toast.loading(
      publishTarget === 'navimumbai'
        ? '🇮🇳 मराठी बातमी तयार होत आहे... (20-30 sec)'
        : '📰 Generating full English article... (15-20 sec)',
      { duration: 40000 }
    );
    try {
      const res = await api.post('/ai/generate-full', {
        topic: topic.trim(),
        source_url: sourceUrl.trim() || '',
        publish_to: publishTarget,
      });
      const d = res.data?.data;
      if (!d) throw new Error('AI returned empty data');

      // Fill every field
      if (d.title)              setTitle(d.title);
      if (d.content)            setContent(d.content);
      if (d.summary)            setSummary(d.summary);
      if (d.excerpt)            setExcerpt(d.excerpt);
      if (d.category)           setCategory(d.category);
      if (d.seo_title)          setSeoTitle(d.seo_title);
      if (d.meta_description)   setMetaDesc(d.meta_description);
      if (d.focus_keyword)      { setFocusKeyword(d.focus_keyword); setFocusKeyphrase(d.focus_keyword); }
      if (d.slug)               setSlug(d.slug);
      if (d.keywords)           setKeywords(d.keywords);
      if (d.tags)               setTags(d.tags);
      if (d.og_title)           setOgTitle(d.og_title);
      if (d.og_description)     setOgDesc(d.og_description);
      if (d.twitter_title)      setTwitterTitle(d.twitter_title);
      if (d.twitter_description) setTwitterDesc(d.twitter_description);
      if (d.canonical_url)      setCanonicalUrl(d.canonical_url);
      if (d.author_name)        setAuthorName(d.author_name);
      if (d.byline)             setByline(d.byline);
      if (d.city)               setCity(d.city);
      if (d.region)             setRegion(d.region);
      if (d.language)           setLanguage(d.language);
      if (d.image_alt)          setImageAlt(d.image_alt);

      // Auto-open social + attribution panels so user can see filled fields
      if (d.og_title || d.og_description) setShowSocial(true);
      if (d.author_name || d.byline)      setShowAttribution(true);
      if (d.canonical_url)                setShowAdvancedSeo(true);

      toast.dismiss(toastId);
      toast.success('✅ All fields filled! Review and publish.');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.response?.data?.error || err.message || 'Generation failed.');
    } finally {
      setAiLoaders({ all: false });
    }
  };

  const generateField = async (field, setter, promptHint) => {
    setAiLoaders(prev => ({ ...prev, [field]: true }));
    try {
      const baseText   = topic || title || 'News Topic';
      const baseKey    = focusKeyphrase || focusKeyword || baseText;
      const isNM       = publishTarget === 'navimumbai' || publishTarget === 'both';
      const siteDomain = isNM ? 'navimumbaiheadlines.com' : 'nashikheadlines.com';

      // ── Full article context so AI always writes coherent, on-topic output ──
      const articleTitle   = title.trim()   || baseText;
      const articleSnippet = content.trim().slice(0, 800); // first 800 chars of body
      const articleSummary = summary.trim().slice(0, 200);
      const articleCat     = category.trim() || (isNM ? 'Maharashtra' : 'Nashik');
      const articleLang    = isNM ? 'Marathi' : 'English';

      // Shared context prefix injected into every wand prompt
      const CTX = isNM
        ? `संदर्भ:\nशीर्षक: ${articleTitle}\nविषय: ${baseText}\nश्रेणी: ${articleCat}\nफोकस कीफ्रेज: ${baseKey}\nलेख (पहिले 800 अक्षरे): ${articleSnippet || '(अद्याप लिहिला नाही)'}\n\n`
        : `Context:\nTitle: ${articleTitle}\nTopic: ${baseText}\nCategory: ${articleCat}\nFocus keyword: ${baseKey}\nArticle snippet (first 800 chars): ${articleSnippet || '(not written yet)'}\n\n`;

      let promptSnippet = '';

      if (isNM) {
        // Marathi wand prompts — all include CTX for full context
        switch (field) {
          case 'title':
            promptSnippet = `${CTX}वरील बातमीसाठी मराठीत एक आकर्षक शीर्षक लिहा. फोकस की-फ्रेज "${baseKey}" नैसर्गिकपणे समाविष्ट करा. फक्त शीर्षक द्या.`; break;
          case 'content':
            promptSnippet = `"${baseText}" या विषयावर मराठीत किमान 500 शब्दांचा (लक्ष्य 550-600) बातमी लेख लिहा. किमान 5 <h2> आणि प्रत्येक खाली 2-3 <p>. सुरुवात 👉 "नवी मुंबई : प्रतिनिधी". <h2>/<h3> HTML only (Markdown नको). <a href="https://${siteDomain}/related">येथे संबंधित बातमी वाचा</a> आणि <a href="${sourceUrl || 'https://' + siteDomain}">अधिकृत माहिती</a> links समाविष्ट करा. फक्त article content.`; break;
          case 'summary':
            promptSnippet = `${CTX}वरील बातमीचा मराठीत 2 वाक्यांचा सारांश लिहा. फक्त सारांश द्या.`; break;
          case 'category':
            promptSnippet = `${CTX}वरील बातमीसाठी एक category सुचवा: Maharashtra, Navi Mumbai, India, International, Entertainment, Sports, Politics, Business, Technology, Health, Education, Crime. फक्त category नाव द्या.`; break;
          case 'seoTitle':
            promptSnippet = `${CTX}वरील बातमीसाठी मराठीत SEO title लिहा (max 60 chars). "${baseKey}" ने सुरुवात करा. फक्त title द्या.`; break;
          case 'metaDesc':
            promptSnippet = `${CTX}वरील बातमीसाठी मराठीत meta description लिहा (150-155 chars). "${baseKey}" समाविष्ट करा. फक्त description द्या (JSON नको, फक्त text).`; break;
          case 'keywords':
            promptSnippet = `${CTX}वरील बातमीसाठी 8-10 SEO keywords मराठी/इंग्रजीत द्या. comma separated फक्त.`; break;
          case 'tags':
            promptSnippet = `${CTX}वरील बातमीसाठी 16 high-traffic Marathi/Hindi/English news tags द्या. comma separated फक्त.`; break;
          case 'slug':
            promptSnippet = `${CTX}वरील बातमीसाठी URL-friendly slug द्या (hyphens, no spaces, lowercase English). फक्त slug.`; break;
          case 'imageAlt':
            promptSnippet = `${CTX}वरील बातमीच्या featured image साठी मराठीत alt text लिहा (50-120 chars). फक्त alt text.`; break;
          case 'focusKeyword':
            promptSnippet = `${CTX}वरील बातमीसाठी Yoast SEO focus keyphrase सुचवा (2-4 शब्द, मराठी). फक्त keyphrase.`; break;
          default: break;
        }
      } else {
        // English wand prompts — all include CTX
        switch (field) {
          case 'title':
            promptSnippet = `${CTX}Write a catchy English news headline. Include "${baseKey}" naturally. Return ONLY the title string.`; break;
          case 'content':
            promptSnippet = `Write a 550-600 word English news article about "${baseText}" with focus keyword "${baseKey}". Start with a Nashik mention. Use HTML headings <h2> and <h3> (NOT markdown ##). Add internal link <a href="https://nashikheadlines.com/related">Read more on Nashik Headlines</a> and outbound link <a href="${sourceUrl || 'https://nashikheadlines.com'}">Official source</a>. Return ONLY the article content HTML.`; break;
          case 'summary':
            promptSnippet = `${CTX}Write a 2-sentence English summary for this article. Return ONLY the summary.`; break;
          case 'category':
            promptSnippet = `${CTX}Suggest one category from: Nashik, Maharashtra, India, International, Entertainment, Sports, Politics, Business, Technology, Health, Education, Crime. Return ONLY the category name.`; break;
          case 'seoTitle':
            promptSnippet = `${CTX}Write an SEO-optimized English news title (max 55 chars). Start with "${baseKey}". Return ONLY the title.`; break;
          case 'metaDesc':
            promptSnippet = `${CTX}Write an English SEO meta description (100-160 chars) for this article. Include "${baseKey}". Return ONLY the description text (no JSON, no quotes).`; break;
          case 'keywords':
            promptSnippet = `${CTX}List 8-10 comma-separated English SEO keywords including Nashik/Maharashtra context. Return ONLY keywords.`; break;
          case 'tags':
            promptSnippet = `${CTX}Generate 12 comma-separated English news tags relevant to this article. Return ONLY the tags.`; break;
          case 'slug':
            promptSnippet = `${CTX}Create a URL-friendly English slug (lowercase, hyphens, max 60 chars). Return ONLY the slug.`; break;
          case 'imageAlt':
            promptSnippet = `${CTX}Write English image alt text (50-120 chars) for the featured image of this article. Return ONLY the alt text.`; break;
          case 'focusKeyword':
            promptSnippet = `${CTX}Suggest the best Yoast SEO focus keyphrase (2-4 words) for this article. Return ONLY the keyphrase.`; break;
          default: break;
        }
      }

      if (!promptSnippet) { setAiLoaders(prev => ({ ...prev, [field]: false })); return; }

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
      } catch (e) { /* fallback to raw text */ }

      const finalText = extracted.trim().replace(/^"|"$/g, '');
      setter(finalText);
      toast.success(`✅ ${promptHint} updated with full context!`);
    } catch (err) {
      toast.error(err.message || `Failed to generate ${promptHint}`);
    } finally {
      setAiLoaders(prev => ({ ...prev, [field]: false }));
    }
  };

  // ── AI Auto-Fix SEO ──────────────────────────────────────────────────────
  const autoFixSeo = async () => {
    if (!content.trim() && !title.trim()) {
      toast.error('Please generate or write an article first.');
      return;
    }
    if (title.trim() || content.trim()) saveToHistory();
    setAiLoaders(prev => ({ ...prev, seoFix: true }));
    const toastId = toast.loading('🤖 AI Auto-Fixing SEO... (20-30 sec)', { duration: 60000 });
    try {
      const res = await api.post('/seo/optimize', {
        title, content, summary, excerpt, seo_title: seoTitle,
        meta_description: metaDesc, focus_keyword: focusKeyword,
        slug, keywords, tags, category, og_title: ogTitle,
        og_description: ogDesc, twitter_title: twitterTitle,
        twitter_description: twitterDesc, canonical_url: canonicalUrl,
        author_name: authorName, byline, language,
        source_url: sourceUrl,
        publish_to: publishTarget,
        featured_image_alt: imageAlt,
      });
      const d = res.data?.optimized;
      if (!d) throw new Error('No data returned from SEO optimizer');

      // Fill all fields from optimizer result
      if (d.improved_content)   setContent(d.improved_content);
      if (d.title)              setTitle(d.title);
      if (d.seo_title)          setSeoTitle(d.seo_title);
      if (d.meta_description)   setMetaDesc(d.meta_description);
      if (d.focus_keyword)      { setFocusKeyword(d.focus_keyword); setFocusKeyphrase(d.focus_keyword); }
      if (d.slug)               setSlug(d.slug);
      if (d.keywords)           setKeywords(d.keywords);
      if (d.tags)               setTags(d.tags);
      if (d.og_title)           setOgTitle(d.og_title);
      if (d.og_description)     setOgDesc(d.og_description);
      if (d.twitter_title)      setTwitterTitle(d.twitter_title);
      if (d.twitter_description) setTwitterDesc(d.twitter_description);
      if (d.canonical_url)      setCanonicalUrl(d.canonical_url);
      if (d.featured_image_alt) setImageAlt(d.featured_image_alt);
      if (d.excerpt)            setExcerpt(d.excerpt);
      if (d.summary)            setSummary(d.summary);
      if (d.category)           setCategory(d.category);
      if (d.author_name)        setAuthorName(d.author_name);

      // Auto-open SEO panels
      setShowSocial(true);
      setShowAdvancedSeo(true);
      setShowAttribution(true);

      toast.dismiss(toastId);
      const score = d.seo_score || 0;
      toast.success(`✅ SEO Auto-Fixed! Score: ${score}/100 — Review and publish.`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.response?.data?.error || err.message || 'SEO fix failed');
    } finally {
      setAiLoaders(prev => ({ ...prev, seoFix: false }));
    }
  };

  const seoData = calculateSeoScore({
    title,
    content,
    seo_title:        seoTitle,
    meta_description: metaDesc,
    slug,
    keywords:         String(keywords || ''),
    image_alt:        imageAlt,
    focus_keyword:    focusKeyword || focusKeyphrase,
  });
  const seoScore       = seoData?.score        || 0;
  const seoChecks      = seoData?.checks       || {};
  const seoWordCount   = seoData?.wordCount    || 0;
  const seoKwCount     = seoData?.keywordCount || 0;
  const seoKwDensity   = seoData?.keywordDensity || 0;

  // Yoast SEO-style Checklist Items (15 checks)
  const checklistItems = [
    {
      key: 'internalLinks',
      passMsg: 'Internal links: Good job!',
      failMsg: 'Internal links: No internal links appear in this page, make sure to add some!',
    },
    {
      key: 'keyphraseInIntro',
      passMsg: 'Keyphrase in introduction: Good job!',
      failMsg: 'Keyphrase in introduction: Your keyphrase or its synonyms do not appear in the first paragraph. Make sure the topic is clear immediately.',
    },
    {
      key: 'keyphraseInMetaDesc',
      passMsg: 'Keyphrase in meta description: Good job!',
      failMsg: 'Keyphrase in meta description: The meta description has been specified, but it does not contain the keyphrase. Fix that!',
    },
    {
      key: 'keyphraseInSubheadings',
      passMsg: 'Keyphrase in subheading: Good job!',
      failMsg: 'Keyphrase in subheading: Use more keyphrases or synonyms in your H2 and H3 subheadings!',
    },
    {
      key: 'keyphraseInImageAlt',
      passMsg: 'Keyphrase in image alt attributes: Good job!',
      failMsg: 'Keyphrase in image alt attributes: Images on this page do not have alt attributes with at least half of the words from your keyphrase. Fix that!',
    },
    {
      key: 'keyphraseInSlug',
      passMsg: 'Keyphrase in slug: Good job!',
      failMsg: 'Keyphrase in slug: (Part of) your keyphrase does not appear in the slug. Change that!',
    },
    {
      key: 'outboundLinks',
      passMsg: 'Outbound links: Good job!',
      failMsg: 'Outbound links: No outbound links appear in this page. Add some!',
    },
    {
      key: 'images',
      passMsg: 'Images: Good job!',
      failMsg: 'Images: No images appear on this page. Add some!',
    },
    {
      key: 'keyphraseDensity',
      passMsg: `Keyphrase density: The keyphrase was found ${seoKwCount} times. This is great!`,
      failMsg: seoKwCount === 0
        ? 'Keyphrase density: The focus keyphrase was not found in the text. Make sure to use it in your content!'
        : `Keyphrase density: The keyphrase was found ${seoKwCount} times (${seoKwDensity}%). Aim for 1-3% density.`,
    },
    {
      key: 'keyphraseInSeoTitle',
      passMsg: 'Keyphrase in SEO title: The exact match of the focus keyphrase appears at the beginning of the SEO title. Good job!',
      failMsg: 'Keyphrase in SEO title: The focus keyphrase does not appear at the beginning of the SEO title. Move it to the beginning!',
    },
    {
      key: 'keyphraseLength',
      passMsg: 'Keyphrase length: Good job!',
      failMsg: 'Keyphrase length: Your keyphrase should be 2-4 words. Make it more specific!',
    },
    {
      key: 'metaDescLength',
      passMsg: 'Meta description length: Well done!',
      failMsg: `Meta description length: The meta description is ${metaDesc.length} characters. It should be between 120-155 characters.`,
    },
    {
      key: 'previouslyUsed',
      passMsg: "Previously used keyphrase: You've not used this keyphrase before, very good.",
      failMsg: 'Previously used keyphrase: This keyphrase was used before.',
    },
    {
      key: 'singleTitle',
      passMsg: "Single title: You don't have multiple H1 headings, well done!",
      failMsg: 'Single title: Your content has multiple H1 headings. Fix that!',
    },
    {
      key: 'competingLinks',
      passMsg: 'Competing links: There are no links which use your keyphrase or synonym as their anchor text. Nice!',
      failMsg: 'Competing links: Some links use the focus keyphrase as anchor text. Fix that!',
    },
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
      <div className="mb-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">AI News Writer</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Type a topic, generate, then choose where to publish.
              <span className="ml-2 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Auto-Saving</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {publishTarget !== 'navimumbai' && (
              <button onClick={() => handleAction('draft')} disabled={saving || !title.trim() || !content.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors border border-slate-300 dark:border-slate-700 text-sm">
                <Save size={16} /> Save Draft
              </button>
            )}
            <button
              onClick={() => handleAction(publishTarget === 'navimumbai' ? 'draft' : 'published')}
              disabled={saving || !title.trim() || !content.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 disabled:opacity-50 text-white rounded-xl font-bold transition-colors shadow-md text-sm ${
                publishTarget === 'navimumbai' ? 'bg-blue-600 hover:bg-blue-700' :
                publishTarget === 'both' ? 'bg-purple-600 hover:bg-purple-700' :
                'bg-indigo-600 hover:bg-indigo-700'
              }`}>
              <Save size={16} />
              {saving ? 'Saving...' :
                publishTarget === 'navimumbai' ? 'Save WP Draft (Navi Mumbai)' :
                publishTarget === 'both' ? 'Publish to Both' :
                'Publish to Nashik'}
            </button>
            <button onClick={() => resetForm()} title="Clear all fields"
              className="flex items-center gap-2 px-3 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl transition-colors border border-red-200 dark:border-red-900/50">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Publish Target Selector */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Publishing Destination</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'nashik', label: 'Nashik Headlines', sub: 'Saves to DB', color: 'indigo', icon: <MapPin size={16}/> },
              { id: 'navimumbai', label: 'Navi Mumbai Headlines', sub: 'WordPress only, no DB', color: 'blue', icon: <Globe size={16}/> },
              { id: 'both', label: 'Both Portals', sub: 'DB + WordPress', color: 'purple', icon: <Sparkles size={16}/> },
            ].map(opt => (
              <button key={opt.id} onClick={() => setPublishTarget(opt.id)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                  publishTarget === opt.id
                    ? `border-${opt.color}-500 bg-${opt.color}-50 dark:bg-${opt.color}-950/30`
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}>
                <span className={`flex items-center gap-1.5 font-bold text-sm ${
                  publishTarget === opt.id ? `text-${opt.color}-700 dark:text-${opt.color}-300` : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {opt.icon} {opt.label}
                  {publishTarget === opt.id && <CheckCircle size={13} className="ml-auto" />}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{opt.sub}</span>
              </button>
            ))}
          </div>
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
            <p className="text-indigo-700 dark:text-indigo-300 mb-5 font-medium text-sm">
              {publishTarget === 'navimumbai'
                ? '📰 मराठी बातमी लिहिण्यासाठी विषय आणि स्रोत URL टाका — AI सर्व फील्ड भरेल.'
                : publishTarget === 'both'
                ? '📰 Enter topic + source URL — AI will generate Marathi article for both portals.'
                : '📰 Enter the news topic + source URL → AI fills every field in one click.'}
            </p>

            <div className="flex flex-col gap-3 relative z-10">
              {/* Row 1: Topic + Source URL */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">
                    {publishTarget !== 'nashik' ? '📌 विषय (Topic)' : '📌 News Topic'}
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') generateFullArticle(); }}
                    placeholder={publishTarget !== 'nashik'
                      ? 'बातमीचा विषय लिहा (उदा. नवी मुंबईत महापूर)'
                      : 'News topic (e.g. Police raid in Nashik)'}
                    className="w-full px-4 py-3.5 border-2 border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all font-medium text-base placeholder-slate-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">
                    🔗 Source URL <span className="text-slate-400 font-normal normal-case">(optional — for outbound link)</span>
                  </label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://example.gov.in or news source URL"
                    className="w-full px-4 py-3.5 border-2 border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all font-medium text-base placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Row 2: Generate button */}
              <button
                onClick={generateFullArticle}
                disabled={aiLoaders.all || !topic.trim()}
                className={`w-full flex items-center justify-center gap-3 px-8 py-4 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 ${
                  publishTarget === 'navimumbai' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30' :
                  publishTarget === 'both'       ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500/30' :
                                                   'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/30'
                }`}
              >
                {aiLoaders.all
                  ? <><div className="animate-spin"><RefreshCcw size={22} /></div>
                      <span>{publishTarget !== 'nashik' ? 'मराठी बातमी तयार होत आहे...' : 'Generating all fields...'}</span></>
                  : <><Sparkles size={22} />
                      <span>
                        {publishTarget === 'navimumbai' ? '✨ Generate Marathi Article (नवी मुंबई)' :
                         publishTarget === 'both'       ? '✨ Generate for Both Portals' :
                                                         '✨ Generate All Fields (Nashik)'}
                      </span></>
                }
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
              {/* Live word count */}
              {(() => {
                const wc = countWordsFromHtml(content);
                const color = wc >= 400 ? 'text-green-600 dark:text-green-400' : wc >= 300 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400';
                return (
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <span className={`text-xs font-bold ${color} flex items-center gap-1`}>
                      {wc >= 400 ? '✅' : wc >= 300 ? '⚠️' : '❌'} {wc} words
                      {wc < 300 && <span className="font-normal opacity-75"> — Yoast needs 300+</span>}
                      {wc >= 300 && wc < 400 && <span className="font-normal opacity-75"> — Good, aim for 400+</span>}
                      {wc >= 400 && <span className="font-normal opacity-75"> — Excellent!</span>}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{content.length} chars</span>
                  </div>
                );
              })()}
            </div>

            {/* Summary */}
            <div>
              <FieldLabel label="Short Summary (2 Sentences)" fieldKey="summary" setter={setSummary} />
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A brief wrap-up of the news..." rows={3} className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all resize-y" />
            </div>

            {/* Excerpt (for WordPress) */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">WordPress Excerpt</label>
                <span className="text-xs text-slate-400 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded font-medium">Navi Mumbai</span>
              </div>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short excerpt shown on WordPress listing pages..." rows={2} className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all resize-y text-sm" />
            </div>
          </div>

          {/* Attribution & Post Options */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button onClick={() => setShowAttribution(!showAttribution)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                <ChevronRight size={16} className={`transition-transform ${showAttribution ? 'rotate-90' : ''}`} />
                Attribution, Format & Language
              </span>
              <span className="text-xs text-slate-400">Author, byline, post format, language, city</span>
            </button>
            {showAttribution && (
              <div className="p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Author Name</label>
                  <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. Nashik Headlines Team" className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Byline / Reporter</label>
                  <input type="text" value={byline} onChange={(e) => setByline(e.target.value)} placeholder="e.g. Our Correspondent" className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Post Format</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none appearance-none">
                    {['standard','aside','gallery','link','image','quote','status','video','audio','chat'].map(f => (
                      <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none appearance-none">
                    <option value="mr">Marathi (मराठी)</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi (हिंदी)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="nashik" className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Region</label>
                  <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="maharashtra" className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="sticky-check" checked={Boolean(sticky)} onChange={(e) => setSticky(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" />
                  <label htmlFor="sticky-check" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">Sticky Post (pin to top of WordPress site)</label>
                </div>
              </div>
            )}
          </div>

          {/* Social Media OG/Twitter */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button onClick={() => setShowSocial(!showSocial)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                <ChevronRight size={16} className={`transition-transform ${showSocial ? 'rotate-90' : ''}`} />
                Social Media Preview (Open Graph + Twitter)
              </span>
              <span className="text-xs text-slate-400">og:title, og:description, twitter card</span>
            </button>
            {showSocial && (
              <div className="p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">OG Title</label>
                  <input type="text" value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} placeholder="Facebook/WhatsApp share title..." className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Twitter/X Title</label>
                  <input type="text" value={twitterTitle} onChange={(e) => setTwitterTitle(e.target.value)} placeholder="Twitter card title..." className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">OG Description</label>
                  <textarea value={ogDesc} onChange={(e) => setOgDesc(e.target.value)} placeholder="og:description for social shares..." rows={2} className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Twitter Description</label>
                  <textarea value={twitterDesc} onChange={(e) => setTwitterDesc(e.target.value)} placeholder="Twitter card description..." rows={2} className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none resize-none" />
                </div>
              </div>
            )}
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
            <div className={`p-5 border-b ${
              seoScore === 0
                ? 'bg-slate-500 border-slate-600'
                : seoScore >= 80 ? 'bg-green-600 border-green-700'
                : seoScore >= 50 ? 'bg-amber-500 border-amber-600'
                : 'bg-red-500 border-red-600'
            }`}>
               <h3 className="font-bold text-white mb-1 flex items-center justify-between text-lg">
                Yoast SEO Score
                <span className="text-2xl tracking-tight">
                  {seoScore === 0 ? '--' : seoScore}
                  <span className="text-sm opacity-80 font-normal">/100</span>
                </span>
              </h3>
              <p className="text-white/80 text-xs font-medium mb-3">
                {seoScore === 0
                  ? '⚪ Enter a topic and generate an article to see your score.'
                  : seoScore >= 80 ? '🟢 Excellent! Ready for Google Search.'
                  : seoScore >= 50 ? '🟡 Needs slight improvements.'
                  : '🔴 Fix the red marks below to rank higher.'}
              </p>
              {/* AI Auto-Fix SEO Button */}
              <button
                onClick={autoFixSeo}
                disabled={aiLoaders.seoFix || (!content.trim() && !title.trim())}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-all border border-white/30"
              >
                {aiLoaders.seoFix
                  ? <><div className="animate-spin"><RefreshCcw size={15} /></div> Optimizing SEO...</>
                  : <><Wand2 size={15} /> 🤖 AI Auto-Fix All SEO Issues</>
                }
              </button>
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
                <textarea rows={4} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Short Google description (100-160 chars)..." className={`w-full p-2.5 text-sm border-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all resize-none ${
                  metaDesc.length >= 100 && metaDesc.length <= 160
                    ? 'border-green-400 dark:border-green-600'
                    : metaDesc.length > 0
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-slate-200 dark:border-slate-700'
                }`} />
                {/* Live char count */}
                <div className="flex justify-between mt-1 px-0.5">
                  <span className={`text-xs font-bold ${
                    metaDesc.length >= 100 && metaDesc.length <= 160 ? 'text-green-600 dark:text-green-400' :
                    metaDesc.length > 160 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {metaDesc.length >= 100 && metaDesc.length <= 160 ? '✅' : metaDesc.length > 160 ? '❌ Too long!' : metaDesc.length > 0 ? '⚠️ Too short' : ''}
                    {' '}{metaDesc.length}/160 chars
                  </span>
                  <span className="text-xs text-slate-400">ideal: 100–160</span>
                </div>
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

              <div>
                <FieldLabel label="Focus Keyword (Yoast)" fieldKey="focusKeyword" setter={setFocusKeyword} />
                <input type="text" value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} placeholder="Main keyphrase for Yoast SEO..." className="w-full p-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
              </div>

              {showAdvancedSeo && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Advanced SEO</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Canonical URL</label>
                      <input type="text" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://..." className="w-full p-2 text-xs font-mono border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => setShowAdvancedSeo(!showAdvancedSeo)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 font-medium transition-colors">
                <ChevronDown size={13} className={`transition-transform ${showAdvancedSeo ? 'rotate-180' : ''}`} />
                {showAdvancedSeo ? 'Hide' : 'Show'} Advanced SEO
              </button>
            </div>

            {/* Live SEO Checklist Guide — Yoast Style */}
            <div className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-6">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] mb-1">SEO Analysis</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                {seoWordCount > 0 ? `Text length: The text contains ${seoWordCount} words.` : 'No content yet.'}
              </p>
              <ul className="space-y-2.5">
                {checklistItems.map((item) => {
                  const passed = seoChecks[item.key];
                  const msg    = passed ? item.passMsg : item.failMsg;
                  return (
                    <li key={item.key} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${
                      passed
                        ? 'bg-green-50 dark:bg-green-950/20'
                        : 'bg-red-50 dark:bg-red-950/20'
                    }`}>
                      {passed ? (
                        <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      )}
                      <p className={`text-xs leading-relaxed font-medium ${
                        passed
                          ? 'text-green-800 dark:text-green-300'
                          : 'text-red-800 dark:text-red-300'
                      }`}>
                        {msg}
                      </p>
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
