const ErrorResponse = require('../utils/errorResponse');
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache news for 30 minutes
const newsCache = new NodeCache({ stdTTL: 1800 });

// Default news data in case API fails or returns empty
const defaultNews = {
  feed: [
    {
      title: "Understanding Mutual Fund Investment Strategies",
      summary: "A comprehensive guide to various mutual fund investment strategies and how to choose the right one for your portfolio.",
      url: "https://example.com/mutual-fund-strategies",
      timePublished: new Date().toISOString(),
      source: "Budget Brilliance",
      topics: ["mutual funds", "investment strategy", "portfolio management"],
      sentiment: "Neutral"
    },
    {
      title: "Market Analysis: Current Trends in Financial Markets",
      summary: "An analysis of current market trends and their potential impact on mutual fund investments.",
      url: "https://example.com/market-analysis",
      timePublished: new Date().toISOString(),
      source: "Budget Brilliance",
      topics: ["market analysis", "financial markets", "investment trends"],
      sentiment: "Neutral"
    },
    {
      title: "Maximizing Returns: Expert Tips for Mutual Fund Investments",
      summary: "Expert insights on how to maximize returns from your mutual fund investments while managing risk.",
      url: "https://example.com/maximizing-returns",
      timePublished: new Date().toISOString(),
      source: "Budget Brilliance",
      topics: ["investment returns", "risk management", "mutual funds"],
      sentiment: "Somewhat_Bullish"
    }
  ],
  totalResults: 3
};

// @desc    Get latest financial news
// @route   GET /api/news
// @access  Public
const getNews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Check cache first
    const cacheKey = `news_${page}_${limit}`;
    const cachedNews = newsCache.get(cacheKey);
    
    if (cachedNews) {
      return res.status(200).json(cachedNews);
    }

    const response = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'NEWS_SENTIMENT',
        topics: 'financial_markets,finance',
        sort: 'LATEST',
        limit: limit,
        apikey: process.env.ALPHA_VANTAGE_API_KEY
      }
    });

    // Check if response has valid data
    if (!response.data || !response.data.feed || response.data.feed.length === 0) {
      console.log('API returned empty feed, using default news');
      // Store default news in cache
      newsCache.set(cacheKey, defaultNews);
      return res.status(200).json(defaultNews);
    }

    const news = {
      feed: response.data.feed.map(item => ({
        title: item.title,
        summary: item.summary,
        url: item.url,
        timePublished: item.time_published,
        source: item.source,
        topics: item.topics || [],
        sentiment: item.overall_sentiment_label
      })),
      totalResults: response.data.items || response.data.feed.length
    };

    // Store in cache
    newsCache.set(cacheKey, news);

    return res.status(200).json(news);
  } catch (error) {
    console.error('News API Error:', error.response?.data || error.message);
    // Return default news in case of API error
    return res.status(200).json(defaultNews);
  }
};

module.exports = {
  getNews
};
