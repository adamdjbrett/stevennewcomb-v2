export default {
  // Provide author as string for SEO plugin while keeping author object for templates
  authorName: (data) => {
    // If page has explicit author in front matter, use it
    if (data.author && typeof data.author === 'string') {
      return data.author;
    }
    // If author is an object (from author.json), return the name
    if (data.author && typeof data.author === 'object' && data.author.name) {
      return data.author.name;
    }
    // Fall back to site author
    if (data.site && data.site.author) {
      return data.site.author;
    }
    return undefined;
  }
};
