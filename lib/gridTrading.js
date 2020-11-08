const inquirer = require('inquirer')
const { redisClient } = require('./client')
const { getLatestInformation } = require('./rest/market')

// 網格單前處理
const gridTradingInput = () => {
  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'symbol',
        message: '請選擇交易對',
        choices: [
          'BTCUSD',
          'ETHUSD',
          // new inquirer.Separator(),
          // 'BTC/USDT - Inverse',
          // 'ETH/USDT - Inverse',
        ],
        default: 0,
      },
      {
        type: 'rawlist',
        name: 'side',
        choices: ['Buy - Long', 'Sell - Short'],
        default: 1,
      },
      {
        type: 'input',
        name: 'high',
        message: '網格區間上限',
        default: 16000,
      },
      {
        type: 'input',
        name: 'low',
        message: '網格區間下限',
        default: 14000,
      },
      {
        type: 'input',
        name: 'grids',
        message: '網格數量',
        default: 11,
      },
      {
        type: 'input',
        name: 'totalQty',
        message: '總投資額度',
        default: 1000,
      },
    ])
    .then((answers) => {
      const gridTradingSettings = buildGridTradingSettings(answers)

      redisClient.hset('gridTrading', 'settings', JSON.stringify(gridTradingSettings))

      const startAt = gridTradingSettings.startAt
      console.log('aaaa', startAt)
      inquirer
        .prompt({
          type: 'confirm',
          name: 'isConfirm',
          message: '是否確定要下此網格單?',
          default: false,
        })
        .then((answers) => {
          if (answers.isConfirm) {
            console.log('開始下單!')
            gridTradingExecute(startAt)
          } else {
            console.log('重新操作')
          }
        })
    })
}

// 計算網格價位
const buildGridTradingSettings = ({ side, symbol, high, low, grids, totalQty }) => {
  let priceList = []
  const qty = totalQty / grids
  const distance = (high - low) / (grids - 1)
  const startAt = Math.floor(Date.now() / 1000)

  for (let i = 0; i < grids; i++) {
    priceList.push(high - distance * i)
  }
  return {
    priceList,
    side,
    symbol,
    high,
    low,
    grids,
    totalQty,
    qty,
    startAt,
  }
}

// 開始下網格單並訂閱對應價位
// Check
//   redis - settings
//   websocket subscription
//   current order / position / balance
//
// Place order
//   when price is available & store response to redis
//
// Trading price & Trading my orders
//   - always place short order when currentPrice > one of price list
//   - when short-open order is filled, place long-close on next small price
//
const gridTradingExecute = (startAt) => {
  redisClient.hget('gridTrading', 'settings', (error, result) => {
    if (error) {
      console.log(error)
      throw error
    }
    gridTradingSettings = JSON.parse(result)

    if (startAt != gridTradingSettings.startAt) {
      throw 'startAt is not the same'
    }
    // TODO
  })
}

// async function gridTradingSettings() {
//   return new Promise((resolve, reject) => {
//     return redisClient.hget('gridTrading', 'settings', (error, result) => {
//       if (res == null) {
//         reject('fail promise')
//       } else {
//         resolve(res)
//       }
//     })
//   })
// }

module.exports = gridTradingInput
