document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('queryInput').value.trim();
    if (!query) return;

    const btn = document.getElementById('searchBtn');
    btn.textContent = "...";

    chrome.runtime.sendMessage(
        { type: "QUERY_AGENT", query: query, mode: "auto" },
        (response) => {
            btn.textContent = "Ask";

            if (chrome.runtime.lastError) {
                alert("Extension error: reload extension.");
                return;
            }

            renderResult(response);
        }
    );
});

function renderResult(data) {
    const container = document.getElementById('resultContainer');
    const textEl = document.getElementById('matchText');
    const scoreEl = document.getElementById('matchScore');
    const sourceEl = document.getElementById('matchSource');
    const traceEl = document.getElementById('traceDetails');
    const jsonEl = document.getElementById('jsonOutput');

    container.style.display = "block";
    textEl.textContent = data.best_match.text;

    let score = typeof data.best_match.score === "number"
        ? data.best_match.score.toFixed(2)
        : data.best_match.score;

    scoreEl.textContent = `Score: ${score}`;
    sourceEl.textContent = `Source: ${data.best_match.source.toUpperCase()}`;
    traceEl.style.display = "block";

    jsonEl.textContent = JSON.stringify(data, null, 2);
}
