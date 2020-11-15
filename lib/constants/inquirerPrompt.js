const gridTradingInquirerPrompt = [
  {
    type: 'rawlist',
    name: 'symbol',
    message: '請選擇交易對',
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
    message: '網格區間上限',
    default: 17000,
  },
  {
    type: 'input',
    name: 'low',
    message: '網格區間下限',
    default: 15000,
  },
  {
    type: 'input',
    name: 'grids',
    message: '網格數量',
    default: 6,
  },
  {
    type: 'input',
    name: 'totalQty',
    message: '總投資額度',
    default: 6000,
  },
]

module.exports = {
  gridTradingInquirerPrompt: gridTradingInquirerPrompt,
}
