const { WebsocketClient } = require('@pxtrn/bybit-api')
const mainGridTrading = require('./lib/gridTrading')
const { getLatestInformation } = require('./lib/rest/market')
const { accountInfo, getUserLeverage, changeUserLeverage } = require('./lib/rest/account')
const { redisClient, restClient, redisHGetAllAsync } = require('./lib/client')
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

const checkCurrentOrders = () => {
  // redis - GridTrading

  // TODO: redisClient.hgetall('gridTrading', function (_, results) {})

  // bybit - current Order

  // TODO: restClient.getActiveOrder
  // ...and then
  // TODO: restClient.placeActiveOrder

  return 'A'
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
          'Order 未成交訂單',
          'History 已成交訂單',
          'Market 最新成交價',
          'GridTrading 網格單',
        ],
      },
    ])
    .then((answers) => {
      let action = answers.action.split(' ')[0]
      switch (action) {
        case 'Account':
          accountInfo('BTC')
          // changeUserLeverage(5, 'ETHUSD')
          // getUserLeverage()
          break
        case 'Order':
          break
        case 'History':
          break
        case 'GridTrading':
          mainGridTrading()
          break
        case 'Market':
          getLatestInformation('BTCUSD').then((price) => {
            console.log('price', price)
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

  const API_KEY = process.env.API_KEY
  const PRIVATE_KEY = process.env.PRIVATE_KEY
  const ws = new WebsocketClient({ key: API_KEY, secret: PRIVATE_KEY })

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
        // 訂單狀態改變
        // status: [Cancelled New Filled]
        // need check order_id is Filled

        // when find order_type === Filled
        // send Rest.GetActiveOrder to check current Orders
        // and then Rest.placeAnOrder (if needed)
        for (const data of message?.data) {
          const {
            order_id,
            order_type,
            price,
            symbol,
            side,
            qty,
            cum_exec_qty,
            order_status,
          } = data
          console.log(
            `[order] ${symbol} ${side}, Order type: ${order_type}, Price:${price}, Qty: ${cum_exec_qty}/${qty}, Status: ${order_status} - ${order_id}`
          )

          if (order_status === 'Filled') {
            let isExist = false
            let uuid
            let resultObject
            const gridTradingResult = await redisHGetAllAsync('gridTrading')

            // Find the uuid if price and order_id exist
            for (const [key, result] of Object.entries(gridTradingResult)) {
              uuid = key
              resultObject = JSON.parse(result)
              if (
                resultObject?.settings?.priceList?.includes(price) &&
                restClient?.currentOrders[price]?.order_id === order_id
              ) {
                isExist = true

                // update object - from currentOrders to filledOrders
                resultObject.filledOrderIDs.push(order_id)
                resultObject.currentOrders[price] = {}
                break
              }
            }

            // update redis
            if (isExist) {
              console.log('[order] update redis - from currentOrders to filledOrders')
              await redisHSetAsync('gridTrading', uuid, JSON.stringify(resultObject))
            }

            // TODO: check place new Order is needed?
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
  // check redis connection
  const isRedisOK = await checkRedis()
  console.log(isRedisOK)

  // check bybit api
  const isRestOK = await checkRest()
  console.log(isRestOK)

  // check current orders JSON.stringify
  let gridTradingSet

  redisClient.hgetall('gridTrading', function (_, results) {
    if (results) {
      remindInquirer(results)
    } else {
      console.log('目前尚無網格單')
      mainInquirer()
    }
  })
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
