import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import axios from 'axios';

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.2,
});

// Tool: Web search via Serper (optional, graceful fallback)
async function webSearch(query) {
  if (!process.env.SERPER_API_KEY) return null;
  try {
    const { data } = await axios.post(
      'https://google.serper.dev/search',
      { q: query, num: 5 },
      { headers: { 'X-API-KEY': process.env.SERPER_API_KEY }, timeout: 8000 }
    );
    const snippets = (data.organic || [])
      .slice(0, 4)
      .map((r) => `[${r.title}]: ${r.snippet}`)
      .join('\n');
    return snippets || null;
  } catch {
    return null;
  }
}

// Tool: Get financial summary from a public data source (fallback to LLM knowledge)
async function getFinancialContext(company) {
  const searchResults = await webSearch(`${company} stock financial performance 2024 2025 revenue growth`);
  const newsResults = await webSearch(`${company} latest news business risks 2025`);
  return { searchResults, newsResults };
}

// Multi-step research agent using LangChain
export async function runResearchAgent(companyName, onProgress) {
  const steps = [];

  const emit = (step, detail) => {
    steps.push({ step, detail, ts: Date.now() });
    if (onProgress) onProgress({ step, detail });
  };

  emit('init', `Starting research on ${companyName}...`);

  // Step 1: Gather external context
  emit('search', `Searching for latest news and financials...`);
  const { searchResults, newsResults } = await getFinancialContext(companyName);

  const contextBlock = [
    searchResults ? `=== FINANCIAL DATA FROM WEB ===\n${searchResults}` : '',
    newsResults ? `=== RECENT NEWS ===\n${newsResults}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const hasLiveData = contextBlock.length > 0;

  // Step 2: Business fundamentals analysis
  emit('analyze_business', 'Analyzing business model and competitive position...');
  const businessPrompt = hasLiveData
    ? `You are a senior equity analyst. Analyze the business fundamentals of "${companyName}".\n\nLive context:\n${contextBlock}\n\nProvide a structured JSON analysis.`
    : `You are a senior equity analyst. Analyze the business fundamentals of "${companyName}" using your training knowledge. Provide a structured JSON analysis.`;

  const businessMsg = await llm.invoke([
    new SystemMessage(`You are an expert investment analyst. Always respond ONLY with valid JSON, no markdown, no explanation outside JSON.`),
    new HumanMessage(`${businessPrompt}

Return this exact JSON shape:
{
  "company_overview": "2-3 sentence company description",
  "industry": "sector/industry",
  "business_model": "how they make money",
  "competitive_moat": "key competitive advantages",
  "key_risks": ["risk1", "risk2", "risk3"],
  "market_opportunity": "TAM/growth opportunity",
  "management_assessment": "brief note on leadership quality",
  "data_freshness": "live_web_data or training_knowledge"
}`),
  ]);

  let businessAnalysis = {};
  try {
    businessAnalysis = JSON.parse(businessMsg.content);
  } catch {
    businessAnalysis = { company_overview: businessMsg.content, data_freshness: 'training_knowledge' };
  }

  // Step 3: Financial metrics analysis
  emit('analyze_financials', 'Evaluating financial health and metrics...');
  const financialsMsg = await llm.invoke([
    new SystemMessage('You are an expert investment analyst. Respond ONLY with valid JSON.'),
    new HumanMessage(`Assess the financial health of "${companyName}".
${hasLiveData ? `Context:\n${searchResults || ''}` : 'Use your training knowledge.'}

Return JSON:
{
  "revenue_growth": "trend description",
  "profitability": "profitable/path_to_profitability/unprofitable with detail",
  "balance_sheet": "strong/moderate/weak with brief reason",
  "cash_position": "assessment",
  "debt_level": "assessment",
  "valuation_assessment": "cheap/fair/expensive relative to peers",
  "financial_score": 7
}
financial_score is 1-10 (10 = best financial health).`),
  ]);

  let financialsData = {};
  try {
    financialsData = JSON.parse(financialsMsg.content);
  } catch {
    financialsData = { financial_score: 5 };
  }

  // Step 4: Market & sentiment analysis
  emit('analyze_sentiment', 'Assessing market position and sentiment...');
  const sentimentMsg = await llm.invoke([
    new SystemMessage('You are an expert investment analyst. Respond ONLY with valid JSON.'),
    new HumanMessage(`Assess market position and sentiment for "${companyName}".
${hasLiveData ? `Recent news:\n${newsResults || ''}` : 'Use your training knowledge.'}

Return JSON:
{
  "market_sentiment": "bullish/neutral/bearish",
  "recent_catalysts": ["catalyst1", "catalyst2"],
  "macro_tailwinds": ["tailwind1", "tailwind2"],
  "macro_headwinds": ["headwind1", "headwind2"],
  "analyst_consensus": "buy/hold/sell based on general sentiment",
  "sentiment_score": 6
}
sentiment_score 1-10.`),
  ]);

  let sentimentData = {};
  try {
    sentimentData = JSON.parse(sentimentMsg.content);
  } catch {
    sentimentData = { market_sentiment: 'neutral', sentiment_score: 5 };
  }

  // Step 5: Final investment verdict
  emit('verdict', 'Deliberating final investment recommendation...');

  const verdictMsg = await llm.invoke([
    new SystemMessage(`You are the Chief Investment Officer at a top-tier fund. Respond ONLY with valid JSON.`),
    new HumanMessage(`Make a final investment decision for "${companyName}" based on this analysis:

BUSINESS: ${JSON.stringify(businessAnalysis)}
FINANCIALS: ${JSON.stringify(financialsData)}
SENTIMENT: ${JSON.stringify(sentimentData)}

Return JSON:
{
  "verdict": "INVEST" or "PASS" or "HOLD",
  "confidence": 75,
  "thesis": "3-4 sentence investment thesis or reason to pass",
  "bull_case": "what needs to go right",
  "bear_case": "what could go wrong",
  "time_horizon": "short/medium/long term",
  "score_breakdown": {
    "business_quality": 7,
    "financial_health": 6,
    "market_opportunity": 8,
    "risk_adjusted_return": 7
  },
  "key_metrics_to_watch": ["metric1", "metric2", "metric3"],
  "comparable_companies": ["comp1", "comp2"]
}
confidence is 0-100. Scores are 1-10.`),
  ]);

  let verdictData = {};
  try {
    verdictData = JSON.parse(verdictMsg.content);
  } catch {
    verdictData = { verdict: 'HOLD', confidence: 50, thesis: verdictMsg.content };
  }

  emit('complete', 'Research complete!');

  return {
    company: companyName,
    timestamp: new Date().toISOString(),
    has_live_data: hasLiveData,
    business: businessAnalysis,
    financials: financialsData,
    sentiment: sentimentData,
    verdict: verdictData,
    research_steps: steps,
  };
}
