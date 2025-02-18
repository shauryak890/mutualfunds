const Agent = require('../models/Agent');

const generateAgentId = async (role) => {
  const prefix = role === 'agent' ? 'AG' : 'SA';
  const currentYear = new Date().getFullYear().toString().slice(-2);
  
  // Get the latest agent ID for the current year
  const latestAgent = await Agent.findOne({
    agentId: new RegExp(`^${prefix}${currentYear}`)
  }).sort({ agentId: -1 });

  let sequence = '0001';
  if (latestAgent) {
    // Extract the sequence number from the latest agent ID
    const lastSequence = parseInt(latestAgent.agentId.slice(-4));
    sequence = (lastSequence + 1).toString().padStart(4, '0');
  }

  return `${prefix}${currentYear}${sequence}`;
};

module.exports = generateAgentId;
