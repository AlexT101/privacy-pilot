import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "./components/theme-provider"

// Define the structure of the link data with proper TypeScript interface
interface LinkData {
  href: string;
  text: string;
  type: 'policy' | 'terms'; // Making the type more specific with literal types
  pageTitle?: string;
}

// Define message types for better type safety
interface ContentScriptMessage {
  action: 'sendLinks';
  links: LinkData[];
}

interface InjectionResponse {
  status: 'success' | 'failure';
  error?: string;
}

const Sidebar: React.FC = () => {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [isInjecting, setIsInjecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message listener setup with proper cleanup
  useEffect(() => {
    const messageListener = async (
      message: ContentScriptMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: { farewell: string }) => void
    ) => {
      console.log(
        sender.tab
          ? `Message from content script at: ${sender.tab.url}`
          : "Message from the extension"
      );

      if (message.action === 'sendLinks') {
        setLinks(message.links);
        setError(null);
      }

      // Always send a response to avoid orphaned Promise errors
      sendResponse({ farewell: "goodbye" });
    };

    // Add the listener
    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup function to remove the listener
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Inject script handler with proper error handling
  const injectScript = useCallback(async () => {
    setIsInjecting(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage<
        { action: 'injectContentScript' },
        InjectionResponse
      >({ action: 'injectContentScript' });

      if (response?.status === 'success') {
        console.log('Content script injected successfully');
      } else {
        throw new Error(response?.error || 'Failed to inject content script');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Injection error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsInjecting(false);
    }
  }, []);

  // Helper function to get link text
  const getLinkText = (type: LinkData['type']) => {
    return type === 'policy' ? 'Privacy Policy' : 'Terms and Conditions';
  };

  return (
    <div className="p-6 bg-gradient-to-b from-zinc-800 to-zinc-900 w-full h-full">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          TrustFactor
        </h1>
        <p className="text-zinc-400 text-sm mt-2">
          Analyze terms and privacy policies
        </p>
      </div>

      {/* Scan Button */}
      <button
        onClick={injectScript}
        disabled={isInjecting}
        className={`
          w-full px-4 py-3 rounded-lg font-medium
          transition-all duration-200 transform hover:scale-[1.02]
          ${isInjecting 
            ? 'bg-zinc-700 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/20'
          }
        `}
      >
        <div className="flex items-center justify-center space-x-2">
          {isInjecting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              <span>Scanning Page...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Scan for Links</span>
            </>
          )}
        </div>
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results Section */}
      <div className="mt-6">
        <h2 className="text-zinc-400 text-sm font-medium mb-3">
          {links.length ? 'Found Links' : 'No links detected'}
        </h2>
        
        <div className="space-y-3">
          {links.map((link, index) => (
            <a
              key={`${link.href}-${index}`}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-zinc-700/50 hover:bg-zinc-700 
                        transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-md
                  ${link.type === 'policy' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-purple-500/20 text-purple-400'}
                `}>
                  {link.type === 'policy' ? '🔒' : '📜'}
                </div>
                <div>
                  <div className="text-sm font-medium group-hover:text-blue-400 transition-colors">
                    {getLinkText(link.type)}
                  </div>
                  <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                    {link.href}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
    </ThemeProvider>
  );
};


// Mount the Sidebar component with error boundary
const mountSidebar = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Sidebar />
    </React.StrictMode>
  );
};

// Handle mounting errors
try {
  mountSidebar();
} catch (error) {
  console.error('Failed to mount Sidebar:', error);
}

// // Example API connection function
// const fetchFromApi = async (endpoint: string, params: Record<string, string>) => {
//   try {
//     // Build query string from params
//     const queryString = Object.entries(params)
//       .map(([key, value]) => `${encodeURI(key)}=${encodeURI(value)}`)
//       .join('&');

//     // Construct full URL
//     const url = `https://api.example.com/${endpoint}?${queryString}`;

//     const response = await fetch(url, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`API error: ${response.status}`);
//     }

//     return await response.json();
//   } catch (err) {
//     const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
//     console.error('API error:', errorMessage);
//     throw err;
//   }
// };

// // Usage example:
// const getApiData = async () => {
//   try {
//     const data = await fetchFromApi('endpoint', {
//       query: 'search term',
//       filter: 'active',
//     });
//     return data;
//   } catch (error) {
//     // Handle error
//     console.error(error);
//   }
// };

export default Sidebar;