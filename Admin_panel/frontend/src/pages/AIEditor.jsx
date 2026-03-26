import React, { useState } from 'react';
import { Sparkles, Save, Rocket, RotateCcw, Copy, Trash2, ImagePlus, X, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import * as newsroomService from '../services/newsroomService';
import { calculateSeoScore } from '../utils/seoScore';
import aiService from '../api/aiService';

const DEFAULT_PROMPT = `Act as a professional Indian journalist and SEO expert.

Write a Marathi news article (330–350 words) in Google News friendly journalism style.

Topic:
[Write Topic Here]

--------------------------------

Writing Guidelines (Must Follow)

• Article length must be 330 to 350 words strictly
• Language must be simple and clear Marathi
• Journalism style writing
• No spelling or grammar mistakes
• Avoid sentence repetition
• Use passive voice where appropriate

Use transition words in at least 30% of sentences such as:
मात्र, तसेच, दरम्यान, त्यामुळे, याशिवाय, दुसरीकडे, अखेरीस, शिवाय.

--------------------------------

Paragraph Structure

• Each paragraph must start with a clear subheading
• Each paragraph should contain around 20–25 words
• Paragraphs must be short and readable
• Focus keyphrase must appear in the FIRST paragraph

--------------------------------

SEO Requirements

Focus Keyphrase:
[Write Focus Keyphrase]

Focus keyphrase must appear in:
1. SEO Title
2. First paragraph
3. Meta description
4. At least 3 times in article

--------------------------------

SEO Metadata

Return ONLY a perfectly formatted JSON object with no wrapping markdown text like \`\`\`json. The keys must match exactly:
{
  "title": "SEO Title (Max 55 characters)",
  "slug": "url-friendly-slug-in-marathi-english-letters",
  "metaDesc": "Meta Description (Max 155 characters)",
  "category": "Suitable News Category",
  "content": "The full markdown formatted article including Subtitles, Quote Blocks, Source url, etc.",
  "summary": "Short 2 sentence summary excerpt",
  "imageAlt": "Primary image alt text relevant to topic",
  "keywords": "25 high-traffic tags separated by commas"
}

Do not return conversational text. Return only the JSON object.`;

const AIEditor = () => {
  // Base Fields
  const [topic, setTopic] = useState('');
  const [focusKeyphrase, setFocusKeyphrase] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('');

  // SEO & Optimization Fields
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [keywords, setKeywords] = useState('');
  const [slug, setSlug] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Prompt Configuration
  const [showPromptConfig, setShowPromptConfig] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT);

  // Images
  const [images, setImages] = useState([]);

  // States
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [aiLoaders, setAiLoaders] = useState({});

  const maxImages = 4;

  const saveToHistory = () => {
    if (content.trim()) {
      setHistory([
        ...history,
        {
          id: Date.now(),
          title, content, summary, category, seoTitle, metaDesc, keywords, slug, imageAlt,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
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
    setSlug(snapshot.slug || '');
    setImageAlt(snapshot.imageAlt || '');
    toast.success('Restored from history');
  };

  const handleAction = async (status) => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      await newsroomService.createArticle({
        title: (title || '').trim(),
        content: (content || '').trim(),
        summary: (summary || '').trim(),
        category: (category || '').trim(),
        seo_title: (seoTitle || '').trim(),
        meta_description: (metaDesc || '').trim(),
        slug: (slug || '').trim(),
        keywords: String(keywords || '').split(',').map(k => k.trim()).filter(Boolean).join(','),
        image_alt: (imageAlt || '').trim(),
        status: status
      });
      toast.success(status === 'published' ? 'Article published successfully!' : 'Article saved to drafts');
      if (status === 'published') resetForm();
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTopic(''); setFocusKeyphrase(''); setTitle(''); setContent(''); setSummary(''); setCategory('');
    setSeoTitle(''); setMetaDesc(''); setKeywords(''); setSlug(''); setImageAlt('');
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
    const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const generateFullArticle = async () => {
    if (!topic.trim()) {
      toast.error('Topic is required for generating a full article');
      return;
    }

    setAiLoaders({ all: true });
    try {
      // Create request directly hitting the Mistral endpoint wrapped behind our backend
      const response = await aiService.generateArticle({
        prompt: promptTemplate,
        topic,
        focusKeyword: focusKeyphrase || topic
      });

      const text = response.response || '';

      // Parse JSON from text correctly
      let parsed = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(text);
        }
      } catch (err) {
        console.error(err);
        throw new Error('AI returned an invalid format. Please try again.');
      }

      if (parsed) {
        setTitle(parsed.title || `ब्रेकिंग न्यूझ: ${topic}`);
        setContent(parsed.content || '');
        setSummary(parsed.summary || '');
        setCategory(parsed.category || 'ताज्या बातम्या');
        setSeoTitle(parsed.title || '');
        setMetaDesc(parsed.metaDesc || '');
        setKeywords(Array.isArray(parsed.keywords) ? parsed.keywords.join(', ') : (parsed.keywords || ''));
        setSlug(parsed.slug || '');
        setImageAlt(parsed.imageAlt || '');
        toast.success("Full Article Generated!");
      }
    } catch (err) {
      toast.error(err.message || 'Generation failed.');
    } finally {
      setAiLoaders({ all: false });
    }
  };

  // Field specific fallback simulators or micro-prompts can be linked here
  const generateField = (field, setter, promptHint) => {
    setAiLoaders(prev => ({ ...prev, [field]: true }));
    setTimeout(() => {
      let result = '';
      const baseText = topic || title || 'ताजी बातमी';
      const baseKey = focusKeyphrase || baseText;

      switch (field) {
        case 'title': result = `ब्रेकिंग न्यूझ: ${baseText} - सर्व ताजे अपडेट्स`; break;
        case 'content': result = `### ${baseKey} वर नवीन अपडेट\n\nयेथे ${baseText} बद्दल सविस्तर माहिती आहे. मात्र, सध्या परिस्थिती नियंत्रणात आहे. त्यामुळे, नागरिकांनी अफवांवर विश्वास ठेवू नये. याशिवाच, प्रशासनाने योग्य ती काळजी घेण्याचे आवाहन केले आहे.\n\n### पुढील दिशा\n\nदुसरीकडे, अधिकृत सूत्रांनी दिलेल्या माहितीनुसार...`; break;
        case 'summary': result = `${baseText} बद्दल अत्यंत महत्त्वाची बातमी. सर्व ताजे अपडेट्स आणि माहिती एकाच ठिकाणी वाचा.`; break;
        case 'category': result = 'ताज्या बातम्या'; break;
        case 'seoTitle': result = `${baseText} | Nashik Headlines`; break;
        case 'metaDesc': result = `${baseText} संबंधी प्रत्येक महत्त्वाचा अपडेट जाणून घ्या फक्त नाशिक हेडलाईन्सवर.`; break;
        case 'keywords': result = `Nashik, ${baseKey}, Maharashtra News, Marathi News`; break;
        case 'slug': result = baseText.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'marathi-latest-update'; break;
        case 'imageAlt': result = `Representative image showing ${baseKey} scenario in Maharashtra`; break;
      }
      setter(result);
      setAiLoaders(prev => ({ ...prev, [field]: false }));
      toast.success(`${promptHint} Generated`);
    }, 1200);
  };

  const seoScore = title && content ? calculateSeoScore({ title, content, summary, seo_title: seoTitle, meta_description: metaDesc, slug, keywords: String(keywords).split(',') })?.score || 0 : 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            AI Article Studio
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Generate, optimize, and publish high-ranking articles with Mistral.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleAction('draft')}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-100 rounded-md font-medium transition-colors"
          >
            <Save size={20} />
            Save Draft
          </button>
          <button
            onClick={() => handleAction('published')}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
          >
            <Rocket size={20} />
            Publish Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3 space-y-6">

          {/* Prompt Engine Box */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div
              className="p-4 bg-slate-100 dark:bg-slate-800/50 flex justify-between items-center cursor-pointer select-none"
              onClick={() => setShowPromptConfig(!showPromptConfig)}
            >
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Wand2 size={18} className="text-indigo-500" /> System Prompt Config
              </div>
              {showPromptConfig ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
            </div>
            {showPromptConfig && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-2">This dictates how the AI returns data as JSON.</p>
                <textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  className="w-full h-[400px] p-4 text-xs md:text-sm font-mono bg-slate-950 text-emerald-400 rounded-lg border border-slate-700 focus:ring-1 focus:ring-indigo-500 resize-y"
                />
              </div>
            )}
          </div>

          {/* Top Generator Box */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/30">
            <label className="block text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
              Magic Generator
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic: e.g. Nashik Smart City Project"
                className="flex-1 px-4 py-3 border border-indigo-200 dark:border-indigo-800/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-400/40"
              />
              <input
                type="text"
                value={focusKeyphrase}
                onChange={(e) => setFocusKeyphrase(e.target.value)}
                placeholder="Focus Keyphrase: e.g. nashik smart city"
                className="flex-1 px-4 py-3 border border-indigo-200 dark:border-indigo-800/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-400/40"
              />
              <button
                onClick={generateFullArticle}
                disabled={aiLoaders.all || !topic.trim()}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
              >
                {aiLoaders.all ? <div className="animate-spin"><Sparkles size={20} /></div> : <Sparkles size={20} />}
                Generate
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 space-y-5">
            {/* Title */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Article Title</label>
                <button onClick={() => generateField('title', setTitle, 'Title')} className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                  <Wand2 size={12} /> AI Edit
                </button>
              </div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-indigo-400/40" />
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Content</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => copyToClipboard(content)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors" title="Copy to clipboard">
                    <Copy size={16} className="text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Article content..." rows={12} className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-indigo-400/40 resize-none font-sans" />
            </div>

            {/* Summary */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Summary (Excerpt)</label>
                <button onClick={() => generateField('summary', setSummary, 'Summary')} className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                  <Wand2 size={12} /> AI
                </button>
              </div>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary..." rows={3} className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-indigo-400/40 resize-none" />
            </div>
          </div>

          {/* Media / Images */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2"><ImagePlus size={18} /> Media & Images ({images.length}/{maxImages})</h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <img src={img.preview} alt={`upload-${idx}`} className="object-cover w-full h-full" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => removeImage(idx)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {images.length < maxImages && (
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-md aspect-video flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer transition-colors bg-slate-50 dark:bg-slate-950">
                  <ImagePlus size={24} className="mb-2" />
                  <span className="text-xs">Upload 16:9 Image</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Feature Image Alt Text</label>
              </div>
              <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Representative SEO alt text for thumbnail..." className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-indigo-400/40" />
            </div>
          </div>
        </div>

        {/* Sidebar - SEO & Meta */}
        <div className="space-y-6">

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
              Rank on Google
              <span className={`px-2 py-1 text-xs rounded-full ${seoScore >= 80 ? 'bg-green-100 text-green-700' : seoScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                Score: {seoScore}/100
              </span>
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">Category</label>
                </div>
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. ताज्या बातम्या" className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-indigo-400" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">SEO Title (Max 55)</label>
                </div>
                <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-indigo-400" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Meta Description (Max 155)</label>
                </div>
                <textarea rows={4} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-indigo-400 resize-none" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Keywords / Tags (25 max)</label>
                </div>
                <textarea rows={3} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="comma, separated" className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-indigo-400 resize-none" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Smart Slug</label>
                </div>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-indigo-400" />
              </div>
            </div>
          </div>

          {/* Action Box Extra */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
              <RotateCcw size={16} /> Snapshots
            </div>
            <button onClick={saveToHistory} disabled={!content.trim()} className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-slate-200 text-sm font-medium mb-3">
              Save Snapshot
            </button>
            {history.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {history.map((snap) => (
                  <div key={snap.id} onClick={() => restoreFromHistory(snap)} className="text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {snap.timestamp} - {snap.title || 'Untitled'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEditor;

