const { RestClient } = require('@pxtrn/bybit-api')
const inquirer = require('inquirer')

// 下網格單 - 前處理
const gridTradingInput = () => {
  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'symbol',
        message: '請選擇交易對',
        choices: [
          'BTC/USDT - USDT',
          'ETH/USDT - USDT',
          new inquirer.Separator(),
          'BTC/USDT - Inverse',
          'ETH/USDT - Inverse',
        ],
      },
      {
        type: 'rawlist',
        name: 'side',
        choices: ['Buy - Long', 'Sell - Short'],
      },
      {
        type: 'input',
        name: 'high',
        message: '網格區間上限',
      },
      {
        type: 'input',
        name: 'low',
        message: '網格區間下限',
      },
      {
        type: 'input',
        name: 'grids',
        message: '網格數量',
      },
      {
        type: 'input',
        name: 'totalAmount',
        message: '總投資額度',
      },
    ])
    .then((answers) => {
      console.log(JSON.stringify(answers, null, '  '))
      calculateGridTrading(answers)
    })
}

// 下網格單 - 批次下單並持續訂閱相對應價位
const gridTradingExecute = (data) => {}

const calculateGridTrading = ({ symbol, high, low, grids, totalAmount }) => {
  console.log('calculateGridTrading', grids, high)
  let orderList = []
  const distance = (high - low) / (grids - 1)

  for (let i = 0; i < grids; i++) {
    console.log(`No.${i + 1}`, high - distance * i)
  }
}

module.exports = gridTradingInput
