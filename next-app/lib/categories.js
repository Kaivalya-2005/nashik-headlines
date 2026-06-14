export const CATEGORIES = [
  { slug: 'nashik', label: 'नाशिक', colorClass: 'category-nashik', group: 'location' },
  { slug: 'shirdi', label: 'शिर्डी', colorClass: 'category-shirdi', group: 'location' },
  { slug: 'yeola', label: 'येवला', colorClass: 'category-yeola', group: 'location' },
  { slug: 'dhule', label: 'धुळे', colorClass: 'category-dhule', group: 'location' },
  { slug: 'malegaon', label: 'मालेगाव', colorClass: 'category-malegaon', group: 'location' },
  { slug: 'igatpuri', label: 'इगतपुरी', colorClass: 'category-igatpuri', group: 'location' },
  { slug: 'maharashtra', label: 'महाराष्ट्र', colorClass: 'category-maharashtra', group: 'location' },
  { slug: 'india', label: 'भारत', colorClass: 'category-india', group: 'location' },
  { slug: 'international', label: 'आंतरराष्ट्रीय', colorClass: 'category-international', group: 'location' },
  { slug: 'entertainment', label: 'मनोरंजन', colorClass: 'category-entertainment', group: 'topic' },
  { slug: 'sports', label: 'क्रीडा', colorClass: 'category-sports', group: 'topic' },
  { slug: 'politics', label: 'राजकारण', colorClass: 'category-politics', group: 'topic' },
  { slug: 'business', label: 'व्यापार', colorClass: 'category-business', group: 'topic' },
  { slug: 'technology', label: 'तंत्रज्ञान', colorClass: 'category-technology', group: 'topic' },
  { slug: 'health', label: 'आरोग्य', colorClass: 'category-health', group: 'topic' },
  { slug: 'education', label: 'शिक्षण', colorClass: 'category-education', group: 'topic' },
  { slug: 'crime', label: 'गुन्हेगारी', colorClass: 'category-crime', group: 'topic' },
];

export const LOCATION_CATEGORIES = CATEGORIES.filter((c) => c.group === 'location');
export const TOPIC_CATEGORIES = CATEGORIES.filter((c) => c.group === 'topic');
