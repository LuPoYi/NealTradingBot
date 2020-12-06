const { WebsocketClient, DefaultLogger } = require('@pxtrn/bybit-api')
const { redisClient, redisHGetAllAsync, redisHSetAsync, redisHGetAsync } = require('../redisClient')
const { placeActiveOrder } = require('../restAPI')
const { wsLog, logColors, errorLog, systemLog } = require('../utils/helper')
const { primary, success, info, warning, error, bid, ask } = logColors
// wss://stream-testnet.bybit.com/realtime

const websocketSubscribe = () => {
  wsLog('Websocket', 'Subscribe!')

  const dotenv = require('dotenv')
  dotenv.config()

  DefaultLogger.silly = () => {}

  const API_KEY = process.env.API_KEY
  const PRIVATE_KEY = process.env.PRIVATE_KEY
  const ws = new WebsocketClient({ key: API_KEY, secret: PRIVATE_KEY }, DefaultLogger)

  let positionCache = {}

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
          if (
            positionCache[symbol]?.size !== size ||
            positionCache[symbol]?.side !== side ||
            positionCache[symbol]?.entryPrice !== entry_price
          ) {
            positionCache[symbol] = {
              side: side,
              size: size,
              entryPrice: entry_price,
            }
            wsLog(
              'position',
              `${symbol} ${side} Qty: ${size} Entry Price: ${entry_price} Position Value: ${position_value}`
            )
          }
        }
        break
      case 'order':
        // console.log('[order] order', message)
        // 訂單狀態改變
        for (const data of message?.data) {
          let { order_id, order_type, price, symbol, side, qty, order_status } = data
          if (order_status !== 'Filled') {
            continue
          }
          price = parseFloat(price)

          if (['Buy', 'Sell'].includes(side)) {
            let uuid
            let gridTradingObject
            let priceList
            const gridTradingResult = await redisHGetAllAsync('gridTrading')

            // Find the uuid if price and order_id exist
            for (const [key, result] of Object.entries(gridTradingResult)) {
              gridTradingObject = JSON.parse(result)
              priceList = gridTradingObject?.settings?.priceList.sort((a, b) => b - a)
              const currentOrderIDs =
                side === 'Buy'
                  ? gridTradingObject.currentOrderBuyIDs
                  : gridTradingObject.currentOrderSellIDs
              if (priceList?.includes(price) && currentOrderIDs.includes(order_id)) {
                uuid = key
                break
              }
            }

            if (uuid) {
              wsLog(
                'Order',
                'Filled',
                `${symbol} ${order_type} ${side} Price: ${primary(price)} Qty: ${qty} - ${order_id}`
              )
              await filledOrderUpdateRedis({ uuid: uuid, data: data })
              let newSide
              let newPriceIndex
              let newPrice

              if (side === 'Buy') {
                newSide = 'Sell'
                newPriceIndex = priceList.indexOf(price) - 1
              } else if (side === 'Sell') {
                newSide = 'Buy'
                newPriceIndex = priceList.indexOf(price) + 1
              }

              if (newPriceIndex > 0 && newPriceIndex < priceList.length) {
                newPrice = priceList[newPriceIndex]
                // console.log('[order] newPrice', newPrice)

                // Place order And Update Redis
                placeOrderAndUpdateRedis({
                  uuid: uuid,
                  side: newSide,
                  price: newPrice,
                })
              } else {
                systemLog('[Redis] dont need place new order')
              }
            } else {
              errorLog('[Redis] isNotExist', order_id, priceList, price)
            }
          }
        }
        break
      default:
        wsLog('others', message)
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

const filledOrderUpdateRedis = async ({ uuid, data }) => {
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)
  let { order_id, price, side, qty } = data

  gridTradingObject.currentOrders[parseFloat(price)] = {}
  if (side === 'Buy') {
    gridTradingObject.filledOrderBuyIDs.push(order_id)
    gridTradingObject.currentOrderBuyIDs = gridTradingObject.currentOrderBuyIDs.filter(
      (x) => x !== order_id
    )
    gridTradingObject.position += qty
  } else {
    gridTradingObject.filledOrderSellIDs.push(order_id)
    gridTradingObject.currentOrderSellIDs = gridTradingObject.currentOrderSellIDs.filter(
      (x) => x !== order_id
    )
    gridTradingObject.position -= qty
  }

  await redisHSetAsync('gridTrading', uuid, JSON.stringify(gridTradingObject))
}

const placeOrderAndUpdateRedis = async ({ uuid, side, price }) => {
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)
  const symbol = gridTradingObject.settings.symbol
  const qty = gridTradingObject.settings.qty

  const result = await placeActiveOrder({
    side: side,
    symbol: symbol,
    order_type: 'Limit',
    qty: qty,
    price: price,
    reduce_only: false,
  })
  // ERROR: ret_msg: 'reduce-only order has same side with current position',

  gridTradingObject.currentOrders[price] = result
  gridTradingObject.allOrderResults.push(result)
  if (side === 'Buy') {
    gridTradingObject.currentOrderBuyIDs.push(result.order_id)
  } else {
    gridTradingObject.currentOrderSellIDs.push(result.order_id)
  }

  await redisHSetAsync('gridTrading', uuid, JSON.stringify(gridTradingObject))
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
