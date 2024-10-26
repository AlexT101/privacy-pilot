// Set behavior to open the sidebar when the extension icon is clicked
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error("Error setting side panel behavior:", error);
  });
});

// Listen for messages from the React sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "injectContentScript") {
    // Create an async function to use await
    (async () => {
      try {
        // Get active tab using Promise-based API
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Inject the content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content-script.js"]
        });
        
        sendResponse({ status: 'success' });
      } catch (error) {
        sendResponse({ status: 'failure', error: error.message });
      }
    })();
    
    return true; // Still needed for async response
  }
});