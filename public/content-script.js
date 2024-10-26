// Constants for pattern matching
const LINK_PATTERNS = [
  { keywords: ['terms'], type: 'terms' },
  { keywords: ['user', 'agreement'], type: 'terms' },
  { keywords: ['tos'], type: 'terms' },
  { keywords: ['privacy'], type: 'policy' },
  { keywords: ['privacy', 'policy'], type: 'policy' },
  { keywords: ['data', 'protection'], type: 'policy' },
  { keywords: ['legal'], type: 'terms' },
  { keywords: ['conditions'], type: 'terms' }
];

// URL cleaning utility using URL API for better parsing
const cleanUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
  } catch {
    // If URL parsing fails, fall back to basic string cleaning
    return url.split('#')[0].split('?')[0].toLowerCase();
  }
};

// Improved text normalization
const normalizeText = (text) => {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

// Check if text matches a pattern using memoization for performance
const createPatternMatcher = () => {
  const cache = new Map();
  
  return (text, pattern) => {
    const key = `${text}-${pattern.keywords.join(',')}`;
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const normalizedText = normalizeText(text);
    const result = pattern.keywords.length === 1 
      ? normalizedText.includes(pattern.keywords[0])
      : pattern.keywords.every(keyword => normalizedText.includes(keyword));
    
    cache.set(key, result);
    return result;
  };
};

// Main function to extract and process links
const extractLinks = () => {
  const links = Array.from(document.querySelectorAll('a'));
  const seenUrls = new Set();
  const matchPattern = createPatternMatcher();

  return links
    .map(link => ({
      href: link.href,
      text: link.textContent?.trim() || link.href,
      element: link
    }))
    .reduce((acc, { href, text, element }) => {
      try {
        const cleanedHref = cleanUrl(href);

        // Skip chrome-extension URLs
        if (href.startsWith('chrome-extension://')) {
          return acc;
        }
        
        // Skip if we've seen this URL before
        if (seenUrls.has(cleanedHref)) {
          return acc;
        }

        // Check both href and text against patterns
        for (const pattern of LINK_PATTERNS) {
          if (
            (
            matchPattern(cleanedHref, pattern) ||
            matchPattern(text, pattern) ||
            matchPattern(element.getAttribute('aria-label') || '', pattern)
            ) && cleanedHref.trim().length > 2
          ) {
            seenUrls.add(cleanedHref);
            acc.push({
              href: cleanedHref,
              text,
              type: pattern.type
            });
            break; // Stop checking patterns once we find a match
          }
        }

        return acc;
      } catch (error) {
        console.warn('Error processing link:', error);
        return acc;
      }
    }, []);
};

// Main execution with proper error handling and retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const sendLinksWithRetry = async (links, retryCount = 0) => {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'sendLinks',
      links
    });
    
    console.log('Links sent successfully:', response);
  } catch (error) {
    console.error('Error sending links:', error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying... Attempt ${retryCount + 1} of ${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      await sendLinksWithRetry(links, retryCount + 1);
    } else {
      console.error('Max retries reached. Failed to send links.');
    }
  }
};

// Execute when DOM is fully loaded
const init = () => {
  const links = extractLinks();
  
  if (links.length > 0) {
    console.log(`Found ${links.length} matching links`);
    sendLinksWithRetry(links);
  } else {
    console.log('No matching links found');
  }
};

// Handle different DOM states
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  };
}

// Optional: Re-scan for links when dynamic content is loaded
const observer = new MutationObserver(debounce(() => {
  init();
}, 1000));

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Cleanup function
const cleanup = () => {
  observer.disconnect();
  // Add any other cleanup needed
};

// Listen for tab close or navigation
window.addEventListener('unload', cleanup);