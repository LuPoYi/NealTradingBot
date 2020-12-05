const inquirer = require('inquirer')
const mainGridTrading = require('./lib/gridTrading')
const { redisClient, restClient, redisHGetAllAsync, redisHSetAsync } = require('./lib/redisClient')
const {
  getLatestInformation,
  placeActiveOrder,
  getPosition,
  getWalletBalance,
  getUserLeverage,
  changeUserLeverage,
} = require('./lib/restAPI')
const { websocketSubscribe } = require('./lib/websocket')

const checkRedis = () => {
  return new Promise((resolve, reject) => {
    try {
      redisClient.set('foo', Date.now())
      redisClient.get('foo', (error, result) => {
        if (error) {
          throw error
        }
        resolve('[Check] Redis OK', result)
      })
    } catch (err) {
      reject('[Check] Redis Fail', err)
    }
  })
}

const checkCurrentStatus = async () => {
  const latestBtcPrice = await getLatestInformation('BTCUSD')
  console.log('BTC 最新成交價', parseFloat(latestBtcPrice))

  const latestEthPrice = await getLatestInformation('ETHUSD')
  console.log('ETH 最新成交價', parseFloat(latestEthPrice))

  const btcBalance = await getWalletBalance('BTC')
  console.log('BTC 可用餘額', btcBalance?.available_balance)

  const ethBalance = await getWalletBalance('ETH')
  console.log('ETH 可用餘額', ethBalance?.available_balance)

  const btcPosition = await getPosition('BTCUSD')
  console.log(
    `BTC ${btcPosition?.side} 倉位: Qty: ${btcPosition?.size} Value: ${btcPosition?.position_margin}`
  )

  const ethPosition = await getPosition('ETHUSD')
  console.log(
    `ETH ${ethPosition?.side} 倉位: Qty: ${ethPosition?.size} Value: ${ethPosition?.position_margin}`
  )

  const gridTradingResult = await redisHGetAllAsync('previewGridTrading')
  if (gridTradingResult) {
    console.log('目前網格單: ')

    for (const [key, result] of Object.entries(gridTradingResult)) {
      const resultObject = JSON.parse(result)
      const { step, side, symbol, high, low, grids, totalQty, qty } = resultObject?.settings || {}
      console.log(
        `#${key} ${symbol} ${side} ${low}->${high} 網格區間:${step} 網格數:${grids} 單筆網格:${qty} 總投入:${totalQty}`
      )
    }
  } else {
    console.log('目前尚無網格單')
  }
}

const mainInquirer = () => {
  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'action',
        message: '要幹麻?',
        choices: [
          'Account 倉位及餘額',
          'GridTrading 網格單',
          'WebSocket 開啟(會持續追踨已設定價位並下單)',
        ],
      },
    ])
    .then((answers) => {
      let action = answers.action.split(' ')[0]
      switch (action) {
        case 'Account':
          getWalletBalance('BTC')
          getWalletBalance('ETH')
          changeUserLeverage(1, 'BTCUSD')
          changeUserLeverage(1, 'ETHUSD')
          break
        case 'GridTrading':
          mainGridTrading()
          break
        case 'WebSocket':
          websocketSubscribe()
        default:
          break
      }
    })
}

const main = async () => {
  // 1. check redis connection
  const isRedisOK = await checkRedis()
  console.log(isRedisOK)

  // 2. check current status
  await checkCurrentStatus()

  // 3. just a stop
  const checkPoint = await inquirer.prompt({
    type: 'confirm',
    name: 'isContinue',
    message: '是否要繼續?',
    default: false,
  })

  // main interaction
  mainInquirer()
}

main()

// this function should be in the websocket loop
// loop this function to be a websocket listener and place order and update redis
// const checkAndPlaceOrders = () => {
//   let ans
//   console.log('checkAndPlaceOrders')
//   redisClient.hgetall('gridTrading', function (err, results) {
//     if (err) {
//       console.error('err', err)
//     } else {
//       // console.log('results', results)
//       ans = results
//       // a0ivro: '{"settings":{"priceList":[17000,16600,16200,15800,15400,15000],"side":"Sell","symbol":"BTCUSD","high":17000,"low":15000,"grids":6,"totalQty":6000,"qty":1000,"startAt":1605445243},"currentPosition":{},"currentOrders":[],"filledOrders":[],"orderCount":0}',
//       // nogtv8: '{"settings":{"priceList":[17000,16600,16200,15800,15400,15000],"side":"Sell","symbol":"BTCUSD","high":17000,"low":15000,"grids":6,"totalQty":6000,"qty":1000,"startAt":1605703794},"currentPosition":{},"currentOrders":[],"filledOrders":[],"orderCount":0}',
//     }
//   })

//   return ans
// }

// const getActiveOrders = await getActiveOrder({ symbol: 'BTCUSD' })
// console.log('getActiveOrder', getActiveOrders?.result?.data)
