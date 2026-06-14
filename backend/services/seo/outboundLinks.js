/**
 * services/seo/outboundLinks.js
 *
 * Automatic outbound link injection for Yoast SEO compliance.
 * Detects topic from focus keyword + content, injects 1-2 trusted links.
 */

// Trusted source map: topic keyword → { url, label, labelMr }
const OUTBOUND_MAP = {
  weather:     { url: "https://imd.gov.in",                 label: "India Meteorological Department (IMD)",        labelMr: "भारत हवामान विभाग (IMD)" },
  rain:        { url: "https://imd.gov.in",                 label: "India Meteorological Department",              labelMr: "भारत हवामान विभाग" },
  flood:       { url: "https://ndma.gov.in",                label: "National Disaster Management Authority",       labelMr: "राष्ट्रीय आपत्ती व्यवस्थापन प्राधिकरण" },
  health:      { url: "https://mohfw.gov.in",               label: "Ministry of Health and Family Welfare",        labelMr: "आरोग्य आणि कुटुंब कल्याण मंत्रालय" },
  hospital:    { url: "https://mohfw.gov.in",               label: "Ministry of Health and Family Welfare",        labelMr: "आरोग्य आणि कुटुंब कल्याण मंत्रालय" },
  education:   { url: "https://education.gov.in",           label: "Ministry of Education, India",                 labelMr: "भारत शिक्षण मंत्रालय" },
  university:  { url: "https://www.ugc.gov.in",             label: "University Grants Commission (UGC)",           labelMr: "विद्यापीठ अनुदान आयोग (UGC)" },
  exam:        { url: "https://education.gov.in",           label: "Ministry of Education, India",                 labelMr: "भारत शिक्षण मंत्रालय" },
  budget:      { url: "https://www.indiabudget.gov.in",     label: "Union Budget — Government of India",           labelMr: "केंद्रीय अर्थसंकल्प — भारत सरकार" },
  finance:     { url: "https://www.rbi.org.in",             label: "Reserve Bank of India (RBI)",                  labelMr: "भारतीय रिझर्व्ह बँक (RBI)" },
  bank:        { url: "https://www.rbi.org.in",             label: "Reserve Bank of India (RBI)",                  labelMr: "भारतीय रिझर्व्ह बँक (RBI)" },
  stock:       { url: "https://www.sebi.gov.in",            label: "SEBI — Securities and Exchange Board",         labelMr: "भारतीय रोखे आणि विनिमय मंडळ (SEBI)" },
  road:        { url: "https://nhai.gov.in",                label: "National Highways Authority of India",         labelMr: "राष्ट्रीय महामार्ग प्राधिकरण (NHAI)" },
  highway:     { url: "https://nhai.gov.in",                label: "National Highways Authority of India",         labelMr: "राष्ट्रीय महामार्ग प्राधिकरण" },
  railway:     { url: "https://indianrailways.gov.in",      label: "Indian Railways",                              labelMr: "भारतीय रेल्वे" },
  train:       { url: "https://indianrailways.gov.in",      label: "Indian Railways",                              labelMr: "भारतीय रेल्वे" },
  election:    { url: "https://eci.gov.in",                 label: "Election Commission of India",                 labelMr: "भारत निवडणूक आयोग" },
  cricket:     { url: "https://www.bcci.tv",                label: "Board of Control for Cricket in India (BCCI)", labelMr: "भारतीय क्रिकेट नियामक मंडळ (BCCI)" },
  sports:      { url: "https://yas.nic.in",                 label: "Ministry of Youth Affairs and Sports",         labelMr: "युवा व्यवहार आणि क्रीडा मंत्रालय" },
  agriculture: { url: "https://agricoop.nic.in",            label: "Ministry of Agriculture, India",               labelMr: "कृषी मंत्रालय, भारत" },
  farmer:      { url: "https://agricoop.nic.in",            label: "Ministry of Agriculture, India",               labelMr: "कृषी मंत्रालय, भारत" },
  water:       { url: "https://jalshakti-ddws.gov.in",      label: "Jal Shakti Ministry",                          labelMr: "जल शक्ती मंत्रालय" },
  energy:      { url: "https://mnre.gov.in",                label: "Ministry of New and Renewable Energy",         labelMr: "नवीन आणि नवीकरणीय ऊर्जा मंत्रालय" },
  solar:       { url: "https://mnre.gov.in",                label: "Ministry of New and Renewable Energy",         labelMr: "नवीन आणि नवीकरणीय ऊर्जा मंत्रालय" },
  police:      { url: "https://maharashtrapolice.gov.in",   label: "Maharashtra Police",                           labelMr: "महाराष्ट्र पोलीस" },
  crime:       { url: "https://maharashtrapolice.gov.in",   label: "Maharashtra Police",                           labelMr: "महाराष्ट्र पोलीस" },
  maharashtra: { url: "https://maharashtra.gov.in",         label: "Government of Maharashtra",                    labelMr: "महाराष्ट्र शासन" },
  mumbai:      { url: "https://mcgm.gov.in",                label: "Brihanmumbai Municipal Corporation (BMC)",     labelMr: "बृहन्मुंबई महानगरपालिका (BMC)" },
  nashik:      { url: "https://nmcnashik.org.in",           label: "Nashik Municipal Corporation",                 labelMr: "नाशिक महानगरपालिका" },
};

const DEFAULT_SOURCES = [
  { url: "https://pib.gov.in",    label: "Press Information Bureau (PIB)", labelMr: "प्रेस माहिती ब्युरो (PIB)" },
  { url: "https://india.gov.in",  label: "Government of India",            labelMr: "भारत सरकार" },
];

const INTERNAL_DOMAINS = ["nashikheadlines.com", "navimumbaiheadlines.com"];

// Detect topic tags from keyword + content text
function detectTopics(keyword, content) {
  const plain = `${keyword} ${content}`.replace(/<[^>]+>/g, " ").toLowerCase();
  return Object.keys(OUTBOUND_MAP).filter((tag) => plain.includes(tag));
}

// Check if content already has an outbound link
function hasOutboundLink(content) {
  const links = String(content).match(/href=["']https?:\/\/([^"'/]+)/gi) || [];
  return links.some((href) => {
    const domain = href.replace(/href=["']https?:\/\//i, "").split("/")[0];
    return !INTERNAL_DOMAINS.some((d) => domain.includes(d));
  });
}

/**
 * Inject 1-2 trusted outbound links into HTML article content.
 * @param {string} content  - HTML content
 * @param {string} keyword  - Focus keyword
 * @param {object} opts     - { isMarathi, maxLinks, forceInject }
 * @returns {string}        - Content with links appended
 */
function injectOutboundLinks(content, keyword = "", opts = {}) {
  const { isMarathi = false, maxLinks = 2, forceInject = false } = opts;
  const str = String(content);

  if (!forceInject && hasOutboundLink(str)) return str;

  const topics  = detectTopics(keyword, str);
  const sources = [];

  for (const topic of topics) {
    if (sources.length >= maxLinks) break;
    const src = OUTBOUND_MAP[topic];
    if (src && !sources.find((s) => s.url === src.url)) sources.push(src);
  }

  for (const def of DEFAULT_SOURCES) {
    if (sources.length >= maxLinks) break;
    if (!sources.find((s) => s.url === def.url)) sources.push(def);
  }

  if (sources.length === 0) return str;

  const linkItems = sources.slice(0, maxLinks).map((src) => {
    const label = isMarathi ? src.labelMr : src.label;
    return `<li><a href="${src.url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
  }).join("\n");

  const block = isMarathi
    ? `\n<p><strong>अधिकृत संदर्भ:</strong></p>\n<ul>\n${linkItems}\n</ul>\n`
    : `\n<p><strong>Official Sources &amp; References:</strong></p>\n<ul>\n${linkItems}\n</ul>\n`;

  if (/<\/article>/i.test(str)) return str.replace(/<\/article>/i, `${block}</article>`);
  return str + block;
}

module.exports = { injectOutboundLinks, hasOutboundLink, detectTopics };
