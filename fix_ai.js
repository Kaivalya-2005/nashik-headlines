const fs = require('fs');
let code = fs.readFileSync('Admin_panel/frontend/src/pages/AIEditor.jsx', 'utf8');

const regex = /const generateField = \(field, setter, promptHint\) => \{\n\s*setAiLoaders\(prev => \(\{ \.\.\.prev, \[field\]: true \}\)\);\n\n\s*\/\/ Mock delayed AI response\n\s*setTimeout\(\(\) => \{\n\s*\[\s\S]*?\}, 1200\);\n\s*\};/;

const replacement = `const generateField = async (field, setter, promptHint) => {
    setAiLoaders(prev => ({ ...prev, [field]: true }));
    try {
      const baseText = topic || title || 'News Topic';
      const baseKey = focusKeyphrase || baseText;
      let promptSnippet = "";
      
      switch (field) {
        case 'title': promptSnippet = \`Write a short, catchy Marathi news headline about: \${baseText}. Return ONLY the title, no quotes.\`; break;
        case 'content': promptSnippet = \`Write a detailed Marathi news report about: \${baseText} with focus keyword \${baseKey}. Format in Markdown with headings. Return ONLY the content.\`; break;
        case 'summary': promptSnippet = \`Write a 2-sentence summary in Marathi for the news topic: \${baseText}. Return ONLY the summary, no quotes.\`; break;
        case 'category': promptSnippet = \`Suggest a single 1-2 word Marathi news category for: \${baseText}. Return ONLY the category, no quotes.\`; break;
        case 'seoTitle': promptSnippet = \`Write an SEO optimized Marathi news title for: \${baseText}. Return ONLY the title, no quotes.\`; break;
        case 'metaDesc': promptSnippet = \`Write an SEO meta description in Marathi (max 150 chars) for: \${baseText}. Return ONLY the description, no quotes.\`; break;
        case 'keywords': promptSnippet = \`List 5 comma-separated SEO keywords for: \${baseKey}, including Nashik and Maharashtra. Return ONLY the keywords string.\`; break;
        case 'slug': promptSnippet = \`Create a URL-friendly slug using english letters only for the topic: \${baseText}. Return ONLY the slug, no quotes, no spaces.\`; break;
        case 'imageAlt': promptSnippet = \`Write a descriptive image alt text for an image representing: \${baseKey}. Return ONLY the alt text.\`; break;
      }

      const response = await aiService.generateArticle({
        prompt: promptSnippet,
        topic: baseText,
        focusKeyword: baseKey
      });

      const text = (response.response || '').trim().replace(/^"|"$/g, '');
      setter(text);
      toast.success(\`\${promptHint} Generated\`);
    } catch (err) {
      toast.error(err.message || \`Failed to generate \${promptHint}\`);
    } finally {
      setAiLoaders(prev => ({ ...prev, [field]: false }));
    }
  };`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('Admin_panel/frontend/src/pages/AIEditor.jsx', code);
    console.log('Successfully replaced generateField in AIEditor.jsx');
} else {
    // If exact regex fails, use a simpler one
    const simpleRegex = /const generateField = \(field, setter, promptHint\) => \{[\s\S]*?\}, 1200\);\s*\};/;
    if (simpleRegex.test(code)) {
        code = code.replace(simpleRegex, replacement);
        fs.writeFileSync('Admin_panel/frontend/src/pages/AIEditor.jsx', code);
        console.log('Successfully replaced generateField in AIEditor.jsx using simple regex');
    } else {
        console.log('Could not match regex in AIEditor.jsx');
    }
}
