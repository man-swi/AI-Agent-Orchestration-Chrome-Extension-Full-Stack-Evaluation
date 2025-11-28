import { processQuery } from "./agent.js";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "QUERY_AGENT") {
        processQuery(msg.query)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }
});
