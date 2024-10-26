import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Define the structure of the link data with proper TypeScript interface
interface LinkData {
  href: string;
  text: string;
  type: 'policy' | 'terms'; // Making the type more specific with literal types
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
    <div className="p-4 bg-zinc-800 w-full h-full">
      <h1 className="text-3xl font-bold text-zinc-50 mb-8">Linked on Page</h1>
      
      <button
        onClick={injectScript}
        disabled={isInjecting}
        className={`px-4 py-2 rounded ${
          isInjecting 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isInjecting ? 'Scanning...' : 'Scan for Links'}
      </button>

      {error && (
        <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {links.length === 0 ? (
        <p className="mt-4 text-blue-600">No links found</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {links.map((link, index) => (
            <li key={`${link.href}-${index}`}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                {getLinkText(link.type)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
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

// Example API connection function
const fetchFromApi = async (endpoint: string, params: Record<string, string>) => {
  try {
    // Build query string from params
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURI(key)}=${encodeURI(value)}`)
      .join('&');

    // Construct full URL
    const url = `https://api.example.com/${endpoint}?${queryString}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('API error:', errorMessage);
    throw err;
  }
};

// Usage example:
const getApiData = async () => {
  try {
    const data = await fetchFromApi('endpoint', {
      query: 'search term',
      filter: 'active',
    });
    return data;
  } catch (error) {
    // Handle error
    console.error(error);
  }
};

export default Sidebar;