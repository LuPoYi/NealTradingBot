const { WebsocketClient, DefaultLogger } = require('@pxtrn/bybit-api')
const mainGridTrading = require('./lib/gridTrading')
const { getLatestInformation } = require('./lib/rest/market')
const { getWalletBalance, getUserLeverage, changeUserLeverage } = require('./lib/rest/account')
const { redisClient, restClient, redisHGetAllAsync, redisHSetAsync } = require('./lib/client')
const { placeActiveOrder } = require('./lib/rest/order')
const inquirer = require('inquirer')

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

const checkRest = () => {
  return new Promise((resolve, reject) => {
    restClient
      .getLatestInformation()
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          last_price = data['result'].find((item) => item.symbol === 'BTCUSD')?.last_price
          resolve('[Check] Rest API OK', last_price)
        } else {
          throw error
        }
      })
      .catch((err) => {
        reject('[Check] Rest API Fail', err)
      })
  })
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
          // 'Order 未成交訂單',
          // 'History 已成交訂單',
          // 'Market 最新成交價',
          'GridTrading 網格單',
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
        case 'Order':
          // restClient.getPosition({ symbol: 'ETHUSD' }).then((data) => {
          //   console.log('getPosition', data)
          // })
          // restClient.getUserLeverage().then((data) => {
          //   console.log('getUserLeverage', data)
          // })

          // restClient.getActiveOrder({ symbol: 'ETHUSD', order_status: 'New' }).then((data) => {
          //   console.log('getActiveOrder', data.result.data)
          // })

          // restClient.cancelAllActiveOrders({ symbol: 'ETHUSD' }).then((data) => {
          //   console.log('cancelAllActiveOrders', data)
          // })

          // restClient
          //   .placeActiveOrder({
          //     symbol: 'ETHUSD',
          //     side: 'Buy',
          //     order_type: 'Market',
          //     qty: '1645',
          //     time_in_force: 'GoodTillCancel',
          //     reduce_only: true,
          //   })
          //   .then((data) => {
          //     console.log('placeActiveOrder', data)
          //   })
          break
        case 'History':
          break
        case 'GridTrading':
          mainGridTrading()
          break
        case 'Market':
          getLatestInformation('BTCUSD').then((price) => {
            console.log('BTCUSD', price)
          })
          getLatestInformation('ETHUSD').then((price) => {
            console.log('ETHUSD', price)
          })
          break
        default:
          break
      }
    })
}

const remindInquirer = (gridTradingSet) => {
  Object.keys(gridTradingSet).map((uuid) => {
    const obj = JSON.parse(gridTradingSet[uuid])

    console.log(uuid, obj?.settings?.priceList)
  })

  inquirer
    .prompt([
      {
        type: 'checkbox',
        name: 'uuids',
        message: '目前網格: 請選擇要移除的項目，未刪除的網格下一步會繼續追蹤價位並下單',
        choices: Object.keys(gridTradingSet),
      },
    ])
    .then((answers) => {
      let uuids = answers.uuids
      console.log('uuids', uuids)
      uuids.forEach((uuid) => {
        redisClient.hdel('gridTrading', uuid)
        // TODO: 刪bybit order restClient.placeActiveOrder
      })
      mainInquirer()
    })
}

const websocketConnect = () => {
  const dotenv = require('dotenv')
  dotenv.config()

  DefaultLogger.silly = () => {}

  const API_KEY = process.env.API_KEY
  const PRIVATE_KEY = process.env.PRIVATE_KEY
  const ws = new WebsocketClient({ key: API_KEY, secret: PRIVATE_KEY }, DefaultLogger)

  ws.subscribe(['position', 'order'])

  ws.on('open', function () {
    console.log('[websocket] connection open')
  })

  ws.on('update', async function (message) {
    // console.log('[websocket] update', message)
    switch (message?.topic) {
      case 'position':
        for (const data of message?.data) {
          const { symbol, size, side, entry_price, position_value } = data
          console.log(
            `[position] ${symbol} ${side} Qty: ${size} Entry Price: ${entry_price} Position Value: ${position_value}`
          )
        }
        // TODO: set redis currentPosition
        break
      case 'order':
        console.log('[websocket] order', message)
        // 訂單狀態改變
        for (const data of message?.data) {
          let { order_id, order_type, price, symbol, side, qty, cum_exec_qty, order_status } = data
          price = parseInt(price)
          console.log(
            `[order] ${symbol} ${side}, Order type: ${order_type}, Price:${price}, Qty: ${cum_exec_qty}/${qty}, Status: ${order_status} - ${order_id}`
          )

          if (order_status === 'Filled') {
            let isExist = false
            let uuid
            let resultObject
            let priceList
            const gridTradingResult = await redisHGetAllAsync('gridTrading')

            // Find the uuid if price and order_id exist
            for (const [key, result] of Object.entries(gridTradingResult)) {
              // above: (node:9899) UnhandledPromiseRejectionWarning: TypeError: Cannot convert undefined or null to object
              uuid = key
              resultObject = JSON.parse(result)
              priceList = resultObject?.settings?.priceList
              console.log('priceList', priceList)
              console.log('price', price)
              console.log('resultObject?.currentOrderIDs', resultObject?.currentOrderIDs)
              if (priceList?.includes(price) && resultObject?.currentOrderIDs.includes(order_id)) {
                isExist = true

                // update object - from currentOrders to filledOrders
                resultObject.filledOrderIDs.push(order_id)
                resultObject.currentOrders[price] = {}
                resultObject.currentOrderIDs = resultObject.currentOrderIDs.filter(
                  (x) => x !== order_id
                )
                break
              }
            }

            // update redis
            if (isExist) {
              console.log('[order] update redis - from currentOrders to filledOrders')
              await redisHSetAsync('gridTrading', uuid, JSON.stringify(resultObject))

              // TODO: check place new Order is needed?
              priceList = priceList.sort((a, b) => b - a)
              let newSide
              let newPriceIndex
              let newPrice
              const symbol = resultObject?.settings?.symbol
              const qty = resultObject?.settings?.qty

              if (side === 'Buy') {
                newSide = 'Sell'
                newPriceIndex = priceList.indexOf(price) - 1
              } else if (side === 'Sell') {
                newSide = 'Buy'
                newPriceIndex = priceList.indexOf(price) + 1
              }

              console.log('[order] newPriceIndex', newPriceIndex)
              if (newPriceIndex > 0 && newPriceIndex < priceList.length) {
                newPrice = priceList[newPriceIndex]
                console.log('[order] newPrice', newPrice)
                // need place order
                console.log('   placeActiveOrder', newPrice)
                const result = await placeActiveOrder({
                  side: newSide,
                  symbol: symbol,
                  order_type: 'Limit',
                  qty: qty,
                  price: newPrice,
                  reduce_only: false,
                })

                // ERROR: ret_msg: 'reduce-only order has same side with current position',
                resultObject.currentOrders[price] = result
                resultObject.allOrderResults.push(result)
                resultObject.currentOrderIDs.push(result.order_id)
                redisClient.hset('gridTrading', uuid, JSON.stringify(resultObject))
                console.log('[Redis] Update Done!')
              }
            } else {
              console.log('[redis] isNotExist')
            }
          }
        }
        break
      default:
        console.log('[others]', message)
    }
  })

  ws.on('response', function (response) {
    console.log('[websocket] response', response)
  })

  ws.on('close', function () {
    console.log('[websocket] connection closed')
  })

  ws.on('error', function (err) {
    console.error('[websocket] ERR', err)
  })
}

const main = async () => {
  // 1. check redis connection
  const isRedisOK = await checkRedis()
  console.log(isRedisOK)

  // 2. check bybit api
  const isRestOK = await checkRest()
  console.log(isRestOK)

  // 3. show current status(balance, position, orders)
  const btcPrice = await getLatestInformation('BTCUSD')
  console.log('BTC Price', btcPrice)

  const ethPrice = await getLatestInformation('ETHUSD')
  console.log('ETH Price', ethPrice)

  const btcBalance = await getWalletBalance('BTC')
  console.log('BTC Balance', btcBalance)

  const ethBalance = await getWalletBalance('ETH')
  console.log('ETH Balance', ethBalance)

  const checkPoint = await inquirer.prompt({
    type: 'confirm',
    name: 'isContinue',
    message: '是否要繼續?',
    default: false,
  })

  console.log('checkPoint', checkPoint.isContinue)

  // check current orders
  redisClient.hgetall('gridTrading', function (_, results) {
    if (results) {
      remindInquirer(results)
    } else {
      console.log('目前尚無網格單')
      mainInquirer()
    }
  })

  websocketConnect()
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
