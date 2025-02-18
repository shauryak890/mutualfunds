const express = require('express');
const router = express.Router();
const { searchMutualFunds, getFundDetails } = require('../controllers/mutualFundsController');

// Search for funds - this route must come before the :schemeCode route
router.get('/search', searchMutualFunds);

// Get fund data by schemeCode
router.get('/:schemeCode', getFundDetails);

module.exports = router;
