const axios = require('axios');
const NodeCache = require('node-cache');

// Cache instance with a shorter TTL (1 minute) to ensure fresh data
const cache = new NodeCache({ stdTTL: 60 });

// API Configuration
const MFAPI_BASE_URL = 'https://api.mfapi.in';

// List of popular mutual fund scheme codes
const POPULAR_FUNDS = [
  '119598', // SBI Blue Chip Fund
  '120505', // HDFC Top 100 Fund
  '120716', // ICICI Prudential Bluechip Fund
  '118834', // Axis Bluechip Fund
  '118551', // Mirae Asset Large Cap Fund
  '120465', // Kotak Standard Multicap Fund
  '118989', // Aditya Birla Sun Life Frontline Equity Fund
  '118701', // Nippon India Large Cap Fund
  '120178', // UTI Nifty Index Fund
  '119237', // DSP Midcap Fund
  '119776', // HDFC Mid-Cap Opportunities Fund
  '120486', // L&T Midcap Fund
  '120194', // Franklin India Prima Fund
  '119815', // ICICI Prudential Value Discovery Fund
  '120831'  // Kotak Emerging Equity Fund
];

const searchMutualFunds = async (req, res) => {
  try {
    const { query } = req.query;
    console.log('Searching for funds with query:', query);

    let funds = [];
    
    if (!query) {
      // If no query, return popular funds
      console.log('Fetching popular funds...');
      funds = await Promise.all(
        POPULAR_FUNDS.map(async (schemeCode) => {
          try {
            const response = await axios.get(`${MFAPI_BASE_URL}/mf/${schemeCode}`);
            if (response.data && response.data.meta) {
              return {
                schemeCode,
                schemeName: response.data.meta.scheme_name,
                fundHouse: response.data.meta.fund_house,
                schemeType: response.data.meta.scheme_type || 'N/A',
                category: response.data.meta.scheme_category || 'N/A'
              };
            }
          } catch (error) {
            console.error(`Error fetching popular fund ${schemeCode}:`, error.message);
          }
          return null;
        })
      );
      funds = funds.filter(Boolean); // Remove any null entries
    } else {
      // Search for funds based on query
      console.log('Fetching from API...');
      const response = await axios.get(`${MFAPI_BASE_URL}/mf/search?q=${query}`);
      
      if (!response.data || !Array.isArray(response.data)) {
        console.log('Invalid response from API:', response.data);
        throw new Error('Invalid response from mutual funds API');
      }

      funds = response.data.filter(fund => 
        fund.schemeName?.toLowerCase().includes(query.toLowerCase()) ||
        fund.schemeType?.toLowerCase().includes(query.toLowerCase()) ||
        fund.fundHouse?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 15); // Limit to 15 results
    }

    console.log(`Processing ${funds.length} funds`);

    // Get detailed info for each fund
    const detailedFunds = await Promise.all(
      funds.map(async (fund) => {
        try {
          const cacheKey = `fund_${fund.schemeCode}`;
          const cachedFund = cache.get(cacheKey);
          
          if (cachedFund) {
            return cachedFund;
          }

          const detailResponse = await axios.get(`${MFAPI_BASE_URL}/mf/${fund.schemeCode}`);
          if (!detailResponse.data || !detailResponse.data.data) {
            console.log(`No data for fund ${fund.schemeCode}`);
            return fund;
          }

          const navData = detailResponse.data.data;
          const latestNav = navData[0] || {};
          
          const fundDetails = {
            schemeCode: fund.schemeCode,
            schemeName: fund.schemeName,
            fundHouse: fund.fundHouse,
            schemeType: fund.schemeType || 'N/A',
            category: fund.category || 'N/A',
            nav: latestNav.nav || 'N/A',
            lastUpdated: latestNav.date || 'N/A',
            returns: {
              '1Y': calculateReturns(navData, 365) || 'N/A',
              '3Y': calculateReturns(navData, 1095) || 'N/A',
              '5Y': calculateReturns(navData, 1825) || 'N/A'
            }
          };

          cache.set(cacheKey, fundDetails);
          return fundDetails;
        } catch (error) {
          console.error(`Error fetching details for fund ${fund.schemeCode}:`, error.message);
          return {
            ...fund,
            nav: 'N/A',
            lastUpdated: 'N/A',
            returns: { '1Y': 'N/A', '3Y': 'N/A', '5Y': 'N/A' }
          };
        }
      })
    );

    console.log('Sending response with', detailedFunds.length, 'funds');
    res.json(detailedFunds);
  } catch (error) {
    console.error('Error in searchMutualFunds:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch mutual funds data',
      message: error.message 
    });
  }
};

const getFundDetails = async (req, res) => {
  try {
    const { schemeCode } = req.params;
    console.log('Fetching details for scheme:', schemeCode);

    // Always fetch fresh data for individual fund details
    console.log('Fetching from API...');
    const response = await axios.get(`${MFAPI_BASE_URL}/mf/${schemeCode}`);
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response from mutual funds API');
    }

    const fundData = response.data;
    const navData = fundData.data;
    const latestNav = navData[0] || {};

    const result = {
      schemeCode,
      meta: fundData.meta || {},
      nav: latestNav.nav || 'N/A',
      lastUpdated: latestNav.date || 'N/A',
      navHistory: navData.slice(0, 365), // Last 1 year of NAV data
      returns: {
        '1Y': calculateReturns(navData, 365) || 'N/A',
        '3Y': calculateReturns(navData, 1095) || 'N/A',
        '5Y': calculateReturns(navData, 1825) || 'N/A'
      }
    };

    console.log('Sending fund details');
    res.json(result);
  } catch (error) {
    console.error('Error in getFundDetails:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch fund details',
      message: error.message 
    });
  }
};

// Helper function to calculate returns
const calculateReturns = (navData, days) => {
  if (!navData || !Array.isArray(navData) || navData.length < days) {
    return null;
  }

  const currentNAV = parseFloat(navData[0]?.nav);
  const oldNAV = parseFloat(navData[Math.min(days, navData.length - 1)]?.nav);

  if (isNaN(currentNAV) || isNaN(oldNAV) || oldNAV === 0) {
    return null;
  }

  const returns = ((currentNAV - oldNAV) / oldNAV) * 100;
  return returns.toFixed(2) + '%';
};

module.exports = {
  searchMutualFunds,
  getFundDetails
};
