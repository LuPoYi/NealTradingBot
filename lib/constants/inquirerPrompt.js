const gridTradingInquirerPrompt = [
  {
    type: 'rawlist',
    name: 'symbol',
    message: 'Which Pair?',
    choices: ['BTCUSD', 'ETHUSD'],
    default: 0,
  },
  {
    type: 'rawlist',
    name: 'side',
    choices: ['Sell'],
    default: 1,
  },
  {
    type: 'input',
    name: 'high',
    message: 'High?',
    default: 30000,
  },
  {
    type: 'input',
    name: 'low',
    message: 'Low?',
    default: 100,
  },
  {
    type: 'input',
    name: 'grids',
    message: 'How many grids?',
    default: 31,
  },
  {
    type: 'input',
    name: 'totalQty',
    message: 'Total Qty(USD)?',
    default: 300,
  },
]

module.exports = {
  gridTradingInquirerPrompt: gridTradingInquirerPrompt,
}
