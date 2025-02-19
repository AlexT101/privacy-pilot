// Constants for pattern matching
const LINK_PATTERNS = [
  { keywords: ['terms'], type: 'terms' },
  { keywords: ['user', 'agreement'], type: 'terms' },
  { keywords: ['tos'], type: 'terms' },
  { keywords: ['privacy'], type: 'policy' },
  { keywords: ['privacy', 'policy'], type: 'policy' },
  { keywords: ['data', 'protection'], type: 'policy' },
  { keywords: ['legal'], type: 'terms' },
  { keywords: ['conditions'], type: 'terms' },
  { keywords: ['datenschutz'], type: 'policy' },
  { keywords: ['cookie', 'policy'], type: 'policy' },
  { keywords: ['terms', 'service'], type: 'terms' }
];

// URL cleaning utility using URL API for better parsing
// URL cleaning utility using URL API for better parsing
const cleanUrl = (url) => {
  try {
    // Handle relative URLs
    const baseUrl = window.location.origin;
    const absoluteUrl = new URL(url, baseUrl);

    // Remove query parameters and hash fragments
    absoluteUrl.search = ''; // Removes ?stuff
    absoluteUrl.hash = ''; // Removes #stuff

    return absoluteUrl.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
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
    .filter(link => {
      try {
        new URL(link.href);
        return true;
      } catch {
        return false;
      }
    })
    .map(link => {
      // Get the title from the linked page
      let pageTitle = '';
      try {
        // First try to get title from the link's title attribute
        pageTitle = link.getAttribute('title') || 
                   // Then try aria-label
                   link.getAttribute('aria-label') || 
                   // Finally use the link text itself
                   link.textContent?.trim() || 
                   // Fallback to document title if nothing else works
                   document.title || 
                   'Untitled Page';
      } catch {
        pageTitle = 'Untitled Page';
      }

      return {
        href: link.href,
        text: link.textContent?.trim() || link.href,
        element: link,
        pageTitle: pageTitle
      };
    })
    .reduce((acc, { href, text, element, pageTitle }) => {
      try {
        const cleanedHref = cleanUrl(href);

        if (href.startsWith('chrome-extension://') || seenUrls.has(cleanedHref)) {
          return acc;
        }

        for (const pattern of LINK_PATTERNS) {
          if (
            (matchPattern(cleanedHref, pattern) ||
            matchPattern(text, pattern) ||
            matchPattern(element.getAttribute('aria-label') || '', pattern)) &&
            cleanedHref.trim().length > 2
          ) {
            seenUrls.add(cleanedHref);
            acc.push({
              href: cleanedHref,
              text,
              type: pattern.type,
              pageTitle
            });
            break;
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
  const newLinks = extractLinks();
  if (newLinks.length > 0) {
    sendLinksWithRetry(newLinks);
  }
}, 500)); // Reduced from 1000ms to 500ms for better responsiveness

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