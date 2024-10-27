import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider } from "./components/theme-provider";

import { IconLicense, IconLock } from '@tabler/icons-react';
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

const categories = {
  "account_control": {
    "title": "Account Control",
    "description": "Whether users are provided with clear and accessible options to manage, update, and delete their accounts. Ensuring users have robust control over their account settings and personal data."
  },
  "data_collection": {
    "title": "Data Collection",
    "description": "The transparency and clarity regarding what personal data is collected, how it is collected, and the purposes behind it. Clear explanations of the data collection process and its usage."
  },
  "data_deletion": {
    "title": "Data Deletion",
    "description": "Whether users are given the option to request deletion of their personal data and if the process is straightforward. Ensuring ease of data removal and permanent deletion options."
  },
  "data_sharing": {
    "title": "Data Sharing",
    "description": "Specification of when, why, and with whom personal data is shared, ensuring users are informed about third-party data transfers. Limitations and transparency around data sharing practices."
  },
  "legal_rights": {
    "title": "Legal Rights",
    "description": "Outlining the legal rights users have concerning their personal data, such as access, correction, and deletion rights. Clear and comprehensive descriptions of users' legal rights."
  },
  "privacy_controls": {
    "title": "Privacy Controls",
    "description": "Availability of customizable privacy settings allowing users to control the visibility and usage of their personal data. Flexibility in privacy settings and options for granular control."
  },
  "security_measures": {
    "title": "Security Measures",
    "description": "The adequacy of security protocols, including encryption, data breach notifications, and other protective measures. Commitment to strong security practices to safeguard personal data."
  },
  "terms_changes": {
    "title": "Terms Changes",
    "description": "Whether users are informed about updates to the terms or privacy policy with advance notice. Clear communication regarding changes and allowing time for users to review."
  },
  "transparency": {
    "title": "Transparency",
    "description": "The overall clarity and openness of the policy regarding data practices, ensuring users are fully informed about how their data is handled. Transparent explanations of how data is collected, used, and shared."
  },
  "user_content_rights": {
    "title": "User Content Rights",
    "description": "How user-generated content is handled, including ownership and usage rights. Ensuring users retain ownership of their content, with platform usage rights clearly defined and limited to necessary functions."
  }
}

const getCategoryInfo = (category: string) => {
  // Normalize the category by converting to lowercase and removing spaces/underscores.
  const normalizedCategory = category.toLowerCase().replace(/[_\s]+/g, '');

  // Find a matching category in categoriesData using normalized keys.
  const matchingCategory = Object.keys(categories).find(key => {
    const normalizedKey = key.toLowerCase().replace(/[_\s]+/g, '');
    return normalizedKey === normalizedCategory;
  });

  // Return the matched category's title and description, or fallback if not found.
  return matchingCategory
    ? categories[matchingCategory as keyof typeof categories]
    : { title: category, description: "" }; // Fallback to the category name if not found.
};

interface ScoreData {
  quotes: string[];
  score: number;
}

interface Results {
  scores: Record<string, ScoreData>;
}

const ScoreAccordion: React.FC<{ results: Results }> = ({ results }) => {
  return (
    <div className="w-full">
      {Object.keys(results.scores).map((category) => {
        const { quotes, score } = results.scores[category];
        const { title, description } = getCategoryInfo(category); // Get the title and description

        return (
          <div key={category} className="w-full mb-4">
            {/* Progress Bar (Always Visible) */}
            <div className="w-full mb-2">
              <div className="w-full flex justify-between items-center">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value={category}>
                    <AccordionTrigger className="w-full text-left">
                      <span className="font-semibold">{title}: {score}/5</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {description && <p className="text-zinc-300 mb-4">{description}</p>}
                      <p className="text-zinc-300 mb-4 w-full underline underline-offset-4">What We Found</p>
                      <div className="w-full border-l-4 border-zinc-700 pl-3 pb-1">
                        <ul className="text-zinc-400">
                          {quotes.map((quote, index) => (
                            <li key={index} className={index !== quotes.length - 1 ? "mb-4" : ""}>
                              "{quote}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <Progress value={(score / 5) * 100} className="w-full" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

function calculateTotalScore(results: Results): number {
  const scores = Object.values(results.scores);
  const totalScores = scores.reduce((sum, scoreData) => sum + scoreData.score, 0);
  const maxPossibleScore = scores.length * 5;
  const percentageScore = (totalScores / maxPossibleScore) * 100;

  return Math.round(percentageScore);
}

const Sidebar: React.FC = () => {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [isInjecting, setIsInjecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<boolean>(false);
  const [results, setResults] = useState<Results>({
    scores: {
      account_control: {
        quotes: ["exact quote 1", "exact quote 2"],
        score: 3,  // Example score
      },
      data_collection: {
        quotes: ["exact quote 1", "exact quote 2"],
        score: 2,  // Example score
      },
      privacy_info: {
        quotes: ["exact quote 1", "exact quote 2"],
        score: 4,  // Example score
      },
      account_testing: {  // This could be any other unknown key
        quotes: ["exact quote 1", "exact quote 2"],
        score: 5,  // Example score
      },
      // More unknown keys can be added here
    }
  });

  useEffect(() => {
    const messageListener = async (
      message: ContentScriptMessage,
      _: chrome.runtime.MessageSender,
      sendResponse: (response: { farewell: string }) => void
    ) => {
      if (message.action === 'sendLinks') {
        setApi(false);
        setLinks(message.links);
        setError(null);

        try {
          // Extract hrefs from links array
          const hrefs = message.links.slice(0, 3).map(link => link.href);

          // Determine the API endpoint based on the number of URLs
          const API_URL = "https://web-wfvju8ah86e5.up-de-fra1-k8s-1.apps.run-on-seenode.com/"; // Replace with your actual API URL
          let apiEndpoint;

          if (hrefs.length === 1) {
            apiEndpoint = `${API_URL}url/${encodeURIComponent(hrefs[0])}`;
          } else {
            const combinedHrefs = hrefs.map(href => encodeURIComponent(href)).join('||');
            apiEndpoint = `${API_URL}urls/${combinedHrefs}`;
          }

          console.log(apiEndpoint);

          // Make the API call
          const response = await fetch(apiEndpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          // Parse the JSON response
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const result = await response.json();

          // Update the results with the parsed data
          setResults(result);
          setApi(true);
        } catch (error) {
          setApi(false);
          // Handle errors
          if (error instanceof Error) {
            setError(error.message); // If error is an instance of Error, access its message
          } else {
            setError(String(error)); // If it's not an instance of Error, just convert it to a string
          }
        }
      }
      sendResponse({ farewell: "goodbye" });
    };

    // Set up the message listener
    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup on component unmount
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
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="p-6 bg-gradient-to-b from-zinc-800 to-zinc-900 w-full h-full overflow-x-hidden overflow-y-scroll flex flex-col items-center">
        {/* Header Section */}
        <div className="mb-8 w-full">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 text-center w-full">
            PrivacyPilot
          </h1>
          <p className="text-zinc-400 text-sm w-full text-center">
            Analyze Terms and Privacy Policies
          </p>
        </div>

        {/* Scan Button */}
        <button
          onClick={injectScript}
          disabled={isInjecting}
          className={`
          w-full px-4 py-3 rounded-lg font-medium
          transition-all duration-200 transform hover:scale-[1.02]
          bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/20
        `}
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-zinc-50 font-bold text-xl">Scan Terms and Policies</span>
          </div>
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {links.length > 0 ? api ? (
          <>

            <div className="w-full m-2 p-6 rounded-2xl bg-zinc-800 mt-8 outline outline-1 outline-zinc-700 shadow-zinc-800 shadow-md">

              <h2 className="font-medium text-5xl text-center text-zinc-500">
                <span className={`
                  font-extrabold text-6xl ${calculateTotalScore(results) <= 60 ? "text-red-500" : calculateTotalScore(results) <= 80 ? "text-blue-600" : "text-purple-500"}`}>
                  {calculateTotalScore(results)}
                </span>/100
              </h2>
              <p className="mt-3 text-zinc-500 text-sm font-medium w-full text-center">PRIVACY PILOT SCORE</p>
            </div>

            <div className="mt-6 w-full">
              <h2 className="text-zinc-400 text-lg font-medium mb-3 w-full text-center">
                Breakdown
              </h2>
              <ScoreAccordion results={results} />
            </div>


            {/* Results Section */}
            <div className="mt-6">
              <h2 className="text-zinc-400 text-lg font-medium mb-3 w-full text-center">
                Sources Referenced
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
                        {link.type === 'policy' ? <IconLock /> : <IconLicense />}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${link.type === 'policy' ? 'group-hover:text-blue-400' : 'group-hover:text-purple-400'}  transition-colors`}>
                          {link.pageTitle || getLinkText(link.type)}
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
          </>
        ) : (
          <h2 className="text-zinc-400 text-lg font-medium mb-3 w-full text-center mt-8">
            Loading Data...
          </h2>
        ) : (
          <h2 className="text-zinc-400 text-lg font-medium mb-3 w-full text-center mt-8">
            No Content Scanned
          </h2>
        )}
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

export default Sidebar;