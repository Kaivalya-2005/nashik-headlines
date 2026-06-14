export function timeAgo(dateString) {
  if (!dateString) return 'आत्ताच';
  const now = new Date();
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'आत्ताच';
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'आत्ताच';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} मिनिटांपूर्वी`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} तासांपूर्वी`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} दिवसांपूर्वी`;

  return date.toLocaleDateString('mr-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDate(dateString) {
  if (!dateString) return 'अलीकडे';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'अलीकडे';
  return date.toLocaleDateString('mr-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function estimateReadTime(text = '') {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
