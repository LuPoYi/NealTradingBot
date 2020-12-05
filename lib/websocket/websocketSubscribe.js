const { WebsocketClient, DefaultLogger } = require('@pxtrn/bybit-api')
const { redisClient, redisHGetAllAsync, redisHSetAsync } = require('../redisClient')

// wss://stream-testnet.bybit.com/realtime

const websocketSubscribe = () => {
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

module.exports = websocketSubscribe

// Place Order =>
//
// update {
//   topic: 'position',
//   data: [
//     {
//       user_id: 131263,
//       symbol: 'BTCUSD',
//       size: 0,
//       side: 'None',
//       position_value: '0',
//       entry_price: '0',
//       liq_price: '0',
//       bust_price: '0',
//       leverage: '3',
//       order_margin: '0.00068122',
//       position_margin: '0',
//       available_balance: '0.00117878',
//       take_profit: '0',
//       stop_loss: '0',
//       realised_pnl: '0',
//       trailing_stop: '0',
//       trailing_active: '0',
//       wallet_balance: '0.00186',
//       risk_id: 1,
//       occ_closing_fee: '0',
//       occ_funding_fee: '0',
//       auto_add_margin: 1,
//       cum_realised_pnl: '0',
//       position_status: 'Normal',
//       position_seq: 0
//     }
//   ]
// }
// update {
//   topic: 'order',
//   data: [
//     {
//       order_id: 'ec4215b2-c9aa-4188-96fa-e0870980980d',
//       order_link_id: '',
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_type: 'Limit',
//       price: '9777',
//       qty: 9,
//       time_in_force: 'GoodTillCancel',
//       create_type: 'CreateByUser',
//       cancel_type: '',
//       order_status: 'New',
//       leaves_qty: 9,
//       cum_exec_qty: 0,
//       cum_exec_value: '0',
//       cum_exec_fee: '0',
//       timestamp: '2020-11-03T15:04:39.427Z',
//       take_profit: '0',
//       stop_loss: '0',
//       trailing_stop: '0',
//       last_exec_price: '0'
//     }
//   ]
// }

// Cancel Order =>
//
// update {
//   topic: 'order',
//   data: [
//     {
//       order_id: 'ec4215b2-c9aa-4188-96fa-e0870980980d',
//       order_link_id: '',
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_type: 'Limit',
//       price: '9777',
//       qty: 9,
//       time_in_force: 'GoodTillCancel',
//       create_type: 'CreateByUser',
//       cancel_type: 'CancelByUser',
//       order_status: 'Cancelled',
//       leaves_qty: 0,
//       cum_exec_qty: 0,
//       cum_exec_value: '0',
//       cum_exec_fee: '0',
//       timestamp: '2020-11-03T15:05:46.934Z',
//       take_profit: '0',
//       stop_loss: '0',
//       trailing_stop: '0',
//       last_exec_price: '0'
//     }
//   ]
// }
// update {
//   topic: 'position',
//   data: [
//     {
//       user_id: 131263,
//       symbol: 'BTCUSD',
//       size: 0,
//       side: 'None',
//       position_value: '0',
//       entry_price: '0',
//       liq_price: '0',
//       bust_price: '0',
//       leverage: '3',
//       order_margin: '0.00037277',
//       position_margin: '0',
//       available_balance: '0.00148723',
//       take_profit: '0',
//       stop_loss: '0',
//       realised_pnl: '0',
//       trailing_stop: '0',
//       trailing_active: '0',
//       wallet_balance: '0.00186',
//       risk_id: 1,
//       occ_closing_fee: '0',
//       occ_funding_fee: '0',
//       auto_add_margin: 1,
//       cum_realised_pnl: '0',
//       position_status: 'Normal',
//       position_seq: 0
//     }
//   ]
// }

// Place Order =>
//
// update {
//   topic: 'position',
//   data: [
//     {
//       user_id: 131263,
//       symbol: 'BTCUSD',
//       size: 0,
//       side: 'None',
//       position_value: '0',
//       entry_price: '0',
//       liq_price: '0',
//       bust_price: '0',
//       leverage: '3',
//       order_margin: '0.0006501',
//       position_margin: '0',
//       available_balance: '0.0012099',
//       take_profit: '0',
//       stop_loss: '0',
//       realised_pnl: '0',
//       trailing_stop: '0',
//       trailing_active: '0',
//       wallet_balance: '0.00186',
//       risk_id: 1,
//       occ_closing_fee: '0',
//       occ_funding_fee: '0',
//       auto_add_margin: 1,
//       cum_realised_pnl: '0',
//       position_status: 'Normal',
//       position_seq: 0,
//       Isolated: true,
//       mode: 0,
//       position_idx: 0
//     }
//   ]
// }
// update {
//   topic: 'order',
//   data: [
//     {
//       order_id: '106cf585-a609-4cce-bb3e-74a056cd7418',
//       order_link_id: '',
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_type: 'Limit',
//       price: '9666',
//       qty: 8,
//       time_in_force: 'GoodTillCancel',
//       create_type: 'CreateByUser',
//       cancel_type: '',
//       order_status: 'New',
//       leaves_qty: 8,
//       cum_exec_qty: 0,
//       cum_exec_value: '0',
//       cum_exec_fee: '0',
//       timestamp: '2020-11-05T13:54:17.074Z',
//       take_profit: '0',
//       stop_loss: '0',
//       trailing_stop: '0',
//       last_exec_price: '0'
//     }
//   ]
// }

// when order is filled

// update {
//   topic: 'order',
//   data: [
//     {
//       order_id: '19d22591-3091-44f8-ae7a-d109e0a5412a',
//       order_link_id: '',
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_type: 'Limit',
//       price: '18247',
//       qty: 50,
//       time_in_force: 'GoodTillCancel',
//       create_type: 'CreateByUser',
//       cancel_type: '',
//       order_status: 'Filled',
//       leaves_qty: 0,
//       cum_exec_qty: 50,
//       cum_exec_value: '0.00274017',
//       cum_exec_fee: '-0.00000068',
//       timestamp: '2020-11-22T08:59:13.242Z',
//       take_profit: '0',
//       stop_loss: '0',
//       trailing_stop: '0',
//       last_exec_price: '18247'
//     }
//   ]
// }
// update {
//   topic: 'execution',
//   data: [
//     {
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_id: '19d22591-3091-44f8-ae7a-d109e0a5412a',
//       exec_id: '0e54925a-50a6-525a-badb-1e9e2d649eb1',
//       order_link_id: '',
//       price: '18247',
//       order_qty: 50,
//       exec_type: 'Trade',
//       exec_qty: 50,
//       exec_fee: '-0.00000068',
//       leaves_qty: 0,
//       is_maker: true,
//       trade_time: '2020-11-22T08:59:13.242Z'
//     }
//   ]
// }
// update {
//   topic: 'position',
//   data: [
//     {
//       user_id: 131263,
//       symbol: 'BTCUSD',
//       size: 50,
//       side: 'Buy',
//       position_value: '0.00274017',
//       entry_price: '18247.04306667',
//       liq_price: '9146.5',
//       bust_price: '9124',
//       leverage: '1',
//       order_margin: '0',
//       position_margin: '0.00274017',
//       available_balance: '0.02076241',
//       take_profit: '0',
//       stop_loss: '0',
//       realised_pnl: '0.00001171',
//       trailing_stop: '0',
//       trailing_active: '0',
//       wallet_balance: '0.0235067',
//       risk_id: 1,
//       occ_closing_fee: '0.00000412',
//       occ_funding_fee: '0',
//       auto_add_margin: 1,
//       cum_realised_pnl: '0.00001171',
//       position_status: 'Normal',
//       position_seq: 0,
//       Isolated: true,
//       mode: 0,
//       position_idx: 0
//     }
//   ]
// }
// update {
//   topic: 'position',
//   data: [
//     {
//       user_id: 131263,
//       symbol: 'BTCUSD',
//       size: 50,
//       side: 'Buy',
//       position_value: '0.00274017',
//       entry_price: '18247.04306667',
//       liq_price: '9146.5',
//       bust_price: '9124',
//       leverage: '1',
//       order_margin: '0',
//       position_margin: '0.00274017',
//       available_balance: '0.02076241',
//       take_profit: '0',
//       stop_loss: '0',
//       realised_pnl: '0.00001171',
//       trailing_stop: '0',
//       trailing_active: '0',
//       wallet_balance: '0.0235067',
//       risk_id: 1,
//       occ_closing_fee: '0.00000412',
//       occ_funding_fee: '0',
//       auto_add_margin: 1,
//       cum_realised_pnl: '0.00001171',
//       position_status: 'Normal',
//       position_seq: 0,
//       Isolated: true,
//       mode: 0,
//       position_idx: 0
//     }
//   ]
// }
