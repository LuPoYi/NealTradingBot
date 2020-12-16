const { redisHSetAsync, redisHGetAsync } = require('../redisClient')
const { placeActiveOrder } = require('../restAPI')
const { loggerWS } = require('../utils/logger')
const { sendTelegramMessage } = require('../utils/telegramBot')

const processPositionMessage = (datas) => {
  for (const data of datas) {
    const { symbol, size, side, entry_price } = data
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
      console.log('position', `${symbol} ${side} Qty: ${size}`)
    }
  }
}

const filledOrderUpdateRedis = async ({ uuid, data }) => {
  let { order_id, price, side, symbol, qty } = data

  console.log('Order', 'Filled', `${symbol} ${side} Price: ${price}  ${order_id}`)

  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)

  loggerWS.debug(
    'filledOrderUpdateRedis',
    `${symbol} Order #${order_id.split('-')?.[0]} Filled $${price}
    `
  )
  loggerWS.debug(
    `[Redis] filled BuyIDs before ${gridTradingObject.currentOrderBuyIDs.length}
    ${gridTradingObject.currentOrderBuyIDs}`
  )

  loggerWS.debug(
    `[Redis] filled SellIDs before ${gridTradingObject.currentOrderSellIDs.length}
    ${gridTradingObject.currentOrderSellIDs}`
  )

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

  loggerWS.debug(
    `[Redis] filled BuyIDs after ${gridTradingObject.currentOrderBuyIDs.length}
    ${gridTradingObject.currentOrderBuyIDs}`
  )

  loggerWS.debug(
    `[Redis] filled SellIDs after ${gridTradingObject.currentOrderSellIDs.length}
    ${gridTradingObject.currentOrderSellIDs}`
  )

  sendTelegramMessage(`[Filled] ${side}: ${price} - ${order_id}`)
}

const placeOrderAndUpdateRedis = async ({ uuid, side, price, order_id }) => {
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)

  loggerWS.debug('placeOrderAndUpdateRedis', `${side} ${price}`)
  loggerWS.debug(
    `[Redis] place BuyIDs before ${gridTradingObject.currentOrderBuyIDs.length}
    ${gridTradingObject.currentOrderBuyIDs}`
  )

  loggerWS.debug(
    `[Redis] place SellIDs before ${gridTradingObject.currentOrderSellIDs.length}
    ${gridTradingObject.currentOrderSellIDs}`
  )

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

  loggerWS.debug(
    `[Redis] place BuyIDs after ${gridTradingObject.currentOrderBuyIDs.length}
    ${gridTradingObject.currentOrderBuyIDs}`
  )

  loggerWS.debug(
    `[Redis] place SellIDs after ${gridTradingObject.currentOrderSellIDs.length}
    ${gridTradingObject.currentOrderSellIDs}`
  )
  sendTelegramMessage(`[Place] ${side}: ${price} - ${order_id} => ${result.order_id}`)
}

const getNewOrderPriceAndSide = ({ price, side, priceList }) => {
  let isShouldPlaceNewOrder = false
  let newSide, newPriceIndex, newPrice
  if (side === 'Buy') {
    newSide = 'Sell'
    newPriceIndex = priceList.indexOf(price) - 1
  } else if (side === 'Sell') {
    newSide = 'Buy'
    newPriceIndex = priceList.indexOf(price) + 1
  }

  if (newPriceIndex >= 0 && newPriceIndex < priceList.length) {
    isShouldPlaceNewOrder = true
    newPrice = priceList[newPriceIndex]
  }

  return { isShouldPlaceNewOrder, newPrice, newSide }
}

// situation:
// websocket is down for a while, some of my orders filled but I dont know,
// here TODO is place all miss orders => update redis
const checkAndPlaceMissOrders = async ({ uuid }) => {}

module.exports = {
  processPositionMessage: processPositionMessage,
  filledOrderUpdateRedis: filledOrderUpdateRedis,
  placeOrderAndUpdateRedis: placeOrderAndUpdateRedis,
  getNewOrderPriceAndSide: getNewOrderPriceAndSide,
}
