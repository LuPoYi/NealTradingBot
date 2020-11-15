const inquirer = require('inquirer')
const { redisClient } = require('./client')
const { getLatestInformation } = require('./rest/market')

const mainGridTrading = () => {
  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'action',
        message: '網格單總覽',
        choices: ['Current 目前網格單', 'History 歷史網格單', 'GridTrading 下網格單'],
      },
    ])
    .then((answers) => {
      let action = answers.action.split(' ')[0]
      switch (action) {
        case 'Current':
          console.log(redisClient.hgetall('gridTrading'))
          break
        case 'History':
          console.log(redisClient.hgetall('historyGridTrading'))
          break
        case 'GridTrading':
          gridTradingInput()
          break
        default:
          break
      }
    })
}

// 網格單前處理
const gridTradingInput = async () => {
  inquirer.prompt(gridTradingInquirerPrompt).then((answers) => {
    const uuid = Math.random().toString(36).substring(7)
    const gridTradingSettings = buildGridTradingSettings(answers)

    // set redis
    redisClient.hset(
      'previewGridTrading',
      uuid,
      JSON.stringify({
        settings: gridTradingSettings,
        currentPosition: {},
        currentOrders: [],
        filledOrders: [],
        orderCount: 0,
      })
    )

    console.log('網格單建立完成，尚未在bybit下單')

    // const latestPrice = await getLatestInformation('BTCUSD')
    // console.log('目前最新成交價為', latestPrice)
    console.log('將會執行[Market] -3')

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
          gridTradingExecute(uuid)
        } else {
          console.log('重新操作')
        }
      })
  })
}

// 整理網格價位設定
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

const gridTradingExecute = (uuid) => {
  // place market order! (in here?)
  // place limit close order
  // place limit open order
  // move redis previewGridTrading to gridTrading

  redisClient.hget('previewGridTrading', uuid, (error, result) => {
    if (error) {
      console.log(error)
    }
    redisClient.hset('gridTrading', uuid, result)
    redisClient.hdel('previewGridTrading', uuid)
    console.log('move previewGridTrading to gridTrading', result)
  })
}

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
    choices: ['Buy', 'Sell'],
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
]

// loop this function to be a websocket listener and place order and update redis
const loopFunction = () => {}

module.exports = mainGridTrading

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