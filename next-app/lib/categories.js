export const CATEGORIES = [
  { slug: 'nashik', label: 'Nashik', colorClass: 'category-nashik', group: 'location' },
  { slug: 'shirdi', label: 'Shirdi', colorClass: 'category-shirdi', group: 'location' },
  { slug: 'yeola', label: 'Yeola', colorClass: 'category-yeola', group: 'location' },
  { slug: 'dhule', label: 'Dhule', colorClass: 'category-dhule', group: 'location' },
  { slug: 'malegaon', label: 'Malegaon', colorClass: 'category-malegaon', group: 'location' },
  { slug: 'igatpuri', label: 'Igatpuri', colorClass: 'category-igatpuri', group: 'location' },
  { slug: 'maharashtra', label: 'Maharashtra', colorClass: 'category-maharashtra', group: 'location' },
  { slug: 'india', label: 'India', colorClass: 'category-india', group: 'location' },
  { slug: 'international', label: 'International', colorClass: 'category-international', group: 'location' },
  { slug: 'entertainment', label: 'Entertainment', colorClass: 'category-entertainment', group: 'topic' },
  { slug: 'sports', label: 'Sports', colorClass: 'category-sports', group: 'topic' },
  { slug: 'politics', label: 'Politics', colorClass: 'category-politics', group: 'topic' },
  { slug: 'business', label: 'Business', colorClass: 'category-business', group: 'topic' },
  { slug: 'technology', label: 'Technology', colorClass: 'category-technology', group: 'topic' },
  { slug: 'health', label: 'Health', colorClass: 'category-health', group: 'topic' },
  { slug: 'education', label: 'Education', colorClass: 'category-education', group: 'topic' },
  { slug: 'crime', label: 'Crime', colorClass: 'category-crime', group: 'topic' },
];

export const LOCATION_CATEGORIES = CATEGORIES.filter((c) => c.group === 'location');
export const TOPIC_CATEGORIES = CATEGORIES.filter((c) => c.group === 'topic');
