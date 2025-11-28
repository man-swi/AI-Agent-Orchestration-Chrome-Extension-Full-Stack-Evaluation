// -----------------------------
// TOY DOCUMENT STORE
// -----------------------------
export const DOCUMENTS = [
    { id: 1, text: "CentrAlign helps you align your daily tasks with long-term goals." },
    { id: 2, text: "Pricing plans include free tier, pro monthly, and enterprise options." },
    { id: 3, text: "Security is top priority with end-to-end encryption." },
    { id: 4, text: "You can organize tasks using smart categories in CentrAlign." },
    { id: 5, text: "CentrAlign uses AI to optimize your productivity each day." },
    { id: 6, text: "Enterprise version includes team collaboration tools." },
    { id: 7, text: "Data privacy is ensured through secure on-device processing." },
    { id: 8, text: "CentrAlign supports integration with Google Calendar." },
    { id: 9, text: "Free tier users get access to core productivity features." },
    { id: 10, text: "Premium subscription unlocks advanced analytics." }
];

// -----------------------------
// TOKEN UTILITIES
// -----------------------------
export function tokenize(str) {
    return str
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);
}

// -----------------------------
// SEMANTIC SEARCH
// -----------------------------
export function runSemanticSearch(query) {
    const queryTokens = tokenize(query);
    const vocab = new Set(queryTokens);

    DOCUMENTS.forEach(doc =>
        tokenize(doc.text).forEach(w => vocab.add(w))
    );

    const vocabList = Array.from(vocab);

    const vectorize = (text) => {
        const tokens = tokenize(text);
        return vocabList.map(
            v => tokens.filter(t => t === v).length
        );
    };

    const qVec = vectorize(query);

    const cosine = (A, B) => {
        const dot = A.reduce((s, a, i) => s + a * B[i], 0);
        const magA = Math.sqrt(A.reduce((s, a) => s + a * a, 0));
        const magB = Math.sqrt(B.reduce((s, b) => s + b * b, 0));
        return magA && magB ? dot / (magA * magB) : 0;
    };

    const scored = DOCUMENTS.map(doc => ({
        text: doc.text,
        score: cosine(qVec, vectorize(doc.text)),
        source: "local"
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

// -----------------------------
// KEYWORD SEARCH
// -----------------------------
export function runKeywordSearch(query) {
    const queryTokens = tokenize(query);

    const raw = DOCUMENTS.map(doc => {
        const docTokens = tokenize(doc.text);
        let matchCount = 0;
        queryTokens.forEach(q => {
            if (docTokens.includes(q)) matchCount++;
        });
        return { text: doc.text, rawScore: matchCount, source: "local" };
    });

    const maxScore = Math.max(...raw.map(r => r.rawScore), 1);

    const results = raw.map(r => ({
        text: r.text,
        score: parseFloat((r.rawScore / maxScore).toFixed(2)),
        source: "local"
    }));

    return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

// -----------------------------
// FALLBACK PINECONE STUB
// -----------------------------
export function runPineconeStub(query) {
    return {
        text: `Remote: CentrAlign leverages advanced vector databases for memory.`,
        score: 0.95,
        source: "pinecone"
    };
}

// -----------------------------
// IMPROVED PLANNER DECISION
// -----------------------------
function decidePlanner(queryTokens, semanticTop, keywordTop) {
    // Very short queries (1-2 words) -> Check results first
    if (queryTokens.length <= 2) {
        // If keyword found exact matches, use it
        if (keywordTop.score > 0.5) return "keyword_search";
        // Otherwise semantic might catch related words
        return "semantic_search";
    }

    // Long queries (7+ words) -> Semantic better for context
    if (queryTokens.length > 6) return "semantic_search";

    // Medium queries (3-6 words) -> Use hybrid approach
    return "hybrid";
}

// -----------------------------
// MAIN AGENT FUNCTION
// -----------------------------
export async function processQuery(query) {
    const t0 = performance.now();
    const queryTokens = tokenize(query);

    // Run both tools first to make informed decision
    const semantic = runSemanticSearch(query);
    const keyword = runKeywordSearch(query);

    // Make planner decision based on query length and tool results
    const planner = decidePlanner(queryTokens, semantic[0], keyword[0]);

    let best;
    if (planner === "semantic_search") {
        best = semantic[0];
    } else if (planner === "keyword_search") {
        best = keyword[0];
    } else {
        // Hybrid: pick highest score between both tools
        best = semantic[0].score > keyword[0].score ? semantic[0] : keyword[0];
    }

    // Store best local score before fallback
    const bestLocalScore = best.score;
    
    // Fallback rule: if confidence < 0.75, use Pinecone stub
    let usedFallback = false;
    if (best.score < 0.75) {
        usedFallback = true;
        best = runPineconeStub(query);
    }

    const t1 = performance.now();

    // Return in required JSON structure
    return {
        planner_decision: planner,
        used_fallback_tool: usedFallback,
        best_match: {
            text: best.text,
            score: typeof best.score === "number" ? parseFloat(best.score.toFixed(2)) : best.score,
            source: best.source
        },
        trace: {
            reasoning: `Query: "${query}" | Tokens: ${queryTokens.length} | Planner chose: ${planner} | Best local score: ${bestLocalScore.toFixed(2)} | Fallback triggered: ${usedFallback}`,
            semantic_top_k_scores: semantic.map(s => parseFloat(s.score.toFixed(2))),
            keyword_top_k_scores: keyword.map(s => s.score),
            latency_ms: Math.round(t1 - t0)
        }
    };
}