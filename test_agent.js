// --- COPY OF AGENT LOGIC FOR NODE EXECUTION ---
// (In a real scenario, we would import, but for immediate submission simplicity:)

const DOCUMENTS = [
    { id: 1, text: "CentrAlign helps you align your daily tasks with long-term goals." },
    { id: 2, text: "Pricing plans include free tier, pro monthly, and enterprise options." },
    { id: 3, text: "Security is top priority with end-to-end encryption." }
];

function tokenize(str) {
    return str.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
}

function createVocabulary(docs, queryTokens) {
    const vocab = new Set();
    docs.forEach(d => tokenize(d.text).forEach(w => vocab.add(w)));
    queryTokens.forEach(w => vocab.add(w));
    return Array.from(vocab).sort();
}

function textToVector(text, vocab) {
    const tokens = tokenize(text);
    return vocab.map(word => tokens.filter(t => t === word).length);
}

function cosineSimilarity(vecA, vecB) {
    const dot = vecA.reduce((sum, val, i) => sum + (val * vecB[i]), 0);
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + (val * val), 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + (val * val), 0));
    return (magA && magB) ? dot / (magA * magB) : 0;
}

function runAgent(query) {
    console.log(`\n🔎 Query: "${query}"`);
    
    // 1. Tool Logic
    const queryTokens = tokenize(query);
    const vocab = createVocabulary(DOCUMENTS, queryTokens);
    const queryVec = textToVector(query, vocab);

    // Semantic
    const semanticRes = DOCUMENTS.map(d => ({
        text: d.text,
        score: cosineSimilarity(queryVec, textToVector(d.text, vocab)),
        source: "local"
    })).sort((a,b) => b.score - a.score)[0];

    // Keyword
    const keywordRes = DOCUMENTS.map(d => {
        let count = 0;
        tokenize(d.text).forEach(w => { if(queryTokens.includes(w)) count++; });
        return { text: d.text, score: count / queryTokens.length, source: "local" };
    }).sort((a,b) => b.score - a.score)[0];

    // Planner
    let decision = "hybrid";
    if (queryTokens.length < 3) decision = "keyword_search";
    if (queryTokens.length > 5) decision = "semantic_search";

    // Result
    let best = decision === "keyword_search" ? keywordRes : semanticRes;
    
    console.log(JSON.stringify({
        planner_decision: decision,
        best_match: { text: best.text, score: best.score.toFixed(2) }
    }, null, 2));
}

// --- RUN TESTS ---
runAgent("price"); // Should trigger Keyword
runAgent("How does CentrAlign help with long term goals?"); // Should trigger Semantic