const { redisHSetAsync, redisHGetAsync } = require('../redisClient')
const {
  getLatestInformation,
  placeActiveOrder,
  getActiveOrder,
  queryActiveOrder,
} = require('../restAPI')
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

  gridTradingObject.currentOrders[parseFloat(price)] = ''
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

const placeOrderAndUpdateRedis = async ({ uuid, side, price, source_order_id }) => {
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

  const { order_id } = result
  gridTradingObject.currentOrders[price] = order_id

  if (side === 'Buy') {
    gridTradingObject.currentOrderBuyIDs.push(order_id)
  } else {
    gridTradingObject.currentOrderSellIDs.push(order_id)
  }
  gridTradingObject.allOrderResults.push(result)

  await redisHSetAsync('gridTrading', uuid, JSON.stringify(gridTradingObject))

  loggerWS.debug(
    `[Redis] place BuyIDs after ${gridTradingObject.currentOrderBuyIDs.length}
    ${gridTradingObject.currentOrderBuyIDs}`
  )

  loggerWS.debug(
    `[Redis] place SellIDs after ${gridTradingObject.currentOrderSellIDs.length}
    ${gridTradingObject.currentOrderSellIDs}`
  )
  sendTelegramMessage(`[Place] ${side}: ${price} => ${order_id} (${source_order_id})`)
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

const checkAndPlaceMissOrders = async ({ uuid }) => {
  console.log('!!!checkAndPlaceMissOrders')
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)
  let { currentOrderBuyIDs, currentOrderSellIDs } = gridTradingObject
  let symbol = uuid.split('_')[1]

  const activeOrderResults = await queryActiveOrder({
    symbol: symbol,
  })

  let isNotExistOrderBuyIDs = currentOrderBuyIDs
  let isNotExistOrderSellIDs = currentOrderSellIDs
  activeOrderResults.forEach((order) => {
    if (order.side === 'Sell') {
      const index = isNotExistOrderSellIDs.indexOf(order.order_id)
      if (index !== -1) {
        isNotExistOrderSellIDs.splice(index, 1)
      }
    } else if (order.side === 'Buy') {
      const index = isNotExistOrderBuyIDs.indexOf(order.order_id)
      if (index !== -1) {
        isNotExistOrderBuyIDs.splice(index, 1)
      }
    }
  })

  console.log('!!!isNotExistOrderSellIDs', isNotExistOrderSellIDs)
  for (const order_id of isNotExistOrderSellIDs) {
    const isOrderExist = await queryActiveOrder({
      symbol: symbol,
      order_id: order_id,
    })

    if (!isOrderExist || isOrderExist.order_status !== 'New') {
      await removeRedisCurrentOrder(uuid, order_id)
    }
  }

  console.log('!!!isNotExistOrderBuyIDs', isNotExistOrderBuyIDs)
  for (const order_id of isNotExistOrderBuyIDs) {
    const isOrderExist = await queryActiveOrder({
      symbol: symbol,
      order_id: order_id,
    })
    console.log('isOrderExist', isOrderExist)

    if (!isOrderExist || isOrderExist.order_status !== 'New') {
      await removeRedisCurrentOrder(uuid, order_id)
    }
  }

  // 710
  const latestPrice = await getLatestInformation(symbol)
  const noOrderPriceList = await getNoOrderPriceList(uuid)
  // [600, 700, 800, 900]
  console.log('!!!noOrderPriceList', noOrderPriceList)
  if (noOrderPriceList.length > 1) {
    const closestPrice = noOrderPriceList.reduce(function (prev, curr) {
      return Math.abs(curr - latestPrice) < Math.abs(prev - latestPrice) ? curr : prev
    })

    for (const price of noOrderPriceList) {
      let side
      if (price === closestPrice) {
        continue
      }

      if (price > latestPrice) {
        side = 'Sell'
        await placeOrderAndUpdateRedis({ uuid: uuid, side: 'Sell', price: price })
      } else if (price < latestPrice) {
        side = 'Buy'
        await placeOrderAndUpdateRedis({ uuid: uuid, side: 'Buy', price: price })
      }
    }
  }
}

const removeRedisCurrentOrder = async (uuid, order_id) => {
  console.log('!!!removeRedisCurrentOrder', uuid, order_id)
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)
  let { currentOrderBuyIDs, currentOrderSellIDs, currentOrders } = gridTradingObject

  const bIndex = currentOrderBuyIDs.indexOf(order_id)
  if (bIndex > -1) {
    currentOrderBuyIDs.splice(bIndex, 1)
  }

  const sIndex = currentOrderSellIDs.indexOf(order_id)
  if (sIndex > -1) {
    currentOrderSellIDs.splice(sIndex, 1)
  }

  const price = Object.keys(currentOrders).find((key) => currentOrders[key] === order_id)
  currentOrders[price] = ''

  gridTradingObject = {
    ...gridTradingObject,
    currentOrderBuyIDs: currentOrderBuyIDs,
    currentOrderSellIDs: currentOrderSellIDs,
    currentOrders: currentOrders,
  }
  await redisHSetAsync('gridTrading', uuid, JSON.stringify(gridTradingObject))
}

const getNoOrderPriceList = async (uuid) => {
  console.log('!!!getMissOrderPriceAndSide', uuid)
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)
  let { currentOrders } = gridTradingObject

  return Object.keys(currentOrders).filter((price) => currentOrders[price] === '')
}

const getUuidBySymbolAndPrice = (gridTradingKeys, symbol, price) => {
  for (const key of gridTradingKeys) {
    let [_date, keySymbol, lowPrice, highPrice, _hash] = key.split('_')
    if (keySymbol === symbol && price >= parseFloat(lowPrice) && price <= parseFloat(highPrice)) {
      return key
    }
  }
  return false
}

module.exports = {
  processPositionMessage: processPositionMessage,
  filledOrderUpdateRedis: filledOrderUpdateRedis,
  placeOrderAndUpdateRedis: placeOrderAndUpdateRedis,
  getNewOrderPriceAndSide: getNewOrderPriceAndSide,
  getUuidBySymbolAndPrice: getUuidBySymbolAndPrice,
  checkAndPlaceMissOrders: checkAndPlaceMissOrders,
}
