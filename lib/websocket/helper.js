const { redisHSetAsync, redisHGetAsync } = require('../redisClient')
const { getLatestInformation, placeActiveOrder, queryActiveOrder } = require('../restAPI')

const filledOrderUpdateRedis = async ({ uuid, data }) => {
  let { order_id, price, side, symbol } = data

  console.log('Order', 'Filled', `${symbol} ${side} Price: ${price}  ${order_id}`)

  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)

  gridTradingObject.currentOrders[parseFloat(price)] = ''
  await redisHSetAsync('gridTrading', uuid, JSON.stringify(gridTradingObject))
}

const placeOrderAndUpdateRedis = async ({ uuid, side, price }) => {
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)

  const symbol = gridTradingObject.settings.symbol
  const qty = gridTradingObject.settings.qty
  console.log('Order', 'Place', `${symbol} ${side} Price: ${price}`)

  const result = await placeActiveOrder({
    side: side,
    symbol: symbol,
    order_type: 'Limit',
    qty: qty,
    price: price,
    reduce_only: false,
  })

  gridTradingObject.currentOrders[price] = result.order_id

  await redisHSetAsync('gridTrading', uuid, JSON.stringify(gridTradingObject))
  console.log('Order', 'Place', `${symbol} ${side} Price: ${price}`, 'redisHSetAsync Done')
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

// 1. Remove currentOrder in Redis base on Bybit
// 2. If miss Order > 1, check latePrice and Place farer price
const checkAndPlaceMissOrders = async ({ uuid }) => {
  console.log('!!!checkAndPlaceMissOrders', uuid)
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  const gridTradingObject = JSON.parse(gridTrading)
  const { settings, currentOrders } = gridTradingObject
  const { symbol, priceList } = settings

  const activeOrderResults = await queryActiveOrder({
    symbol: symbol,
  })

  const bybitUnfilledPriceList = activeOrderResults?.map((order) => parseFloat(order.price))
  const bybitNoOrderPriceList = priceList.filter((p) => !bybitUnfilledPriceList.includes(p))

  const redisNoOrderPriceList = Object.keys(currentOrders).reduce((arr, price) => {
    if (currentOrders[price] === '') {
      arr.push(parseFloat(price))
    }
    return arr
  }, [])
  const redisShouldBeEmptyPriceList = bybitNoOrderPriceList.filter(
    (p) => !redisNoOrderPriceList.includes(p)
  )

  if (redisShouldBeEmptyPriceList.length > 0) {
    await removeRedisCurrentOrder(uuid, redisShouldBeEmptyPriceList)
  }

  const latestPrice = await getLatestInformation(symbol)
  const noOrderPriceList = await getNoOrderPriceList(uuid)

  if (noOrderPriceList.length > 1) {
    console.log('noOrderPriceList > 1', noOrderPriceList)
    const closestPrice = noOrderPriceList.reduce(function (prev, curr) {
      return Math.abs(curr - latestPrice) < Math.abs(prev - latestPrice) ? curr : prev
    })

    for (const price of noOrderPriceList) {
      if (price === closestPrice) {
        continue
      }

      if (price > latestPrice) {
        await placeOrderAndUpdateRedis({ uuid: uuid, side: 'Sell', price: price })
      } else if (price < latestPrice) {
        await placeOrderAndUpdateRedis({ uuid: uuid, side: 'Buy', price: price })
      }
    }
  }
}

const removeRedisCurrentOrder = async (uuid, priceList) => {
  console.log('!!!removeRedisCurrentOrder', uuid, priceList)
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)
  let { currentOrders } = gridTradingObject

  priceList.forEach((price) => {
    currentOrders[price] = ''
  })

  gridTradingObject = {
    ...gridTradingObject,
    currentOrders: currentOrders,
  }
  await redisHSetAsync('gridTrading', uuid, JSON.stringify(gridTradingObject))
}

const getNoOrderPriceList = async (uuid) => {
  console.log('!!!getMissOrderPriceAndSide', uuid)
  const gridTrading = await redisHGetAsync('gridTrading', uuid)
  let gridTradingObject = JSON.parse(gridTrading)
  let { currentOrders } = gridTradingObject

  let redisNoOrderPriceList = Object.keys(currentOrders).reduce((arr, price) => {
    if (currentOrders[price] === '') {
      arr.push(parseFloat(price))
    }
    return arr
  }, [])
  return redisNoOrderPriceList
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
  filledOrderUpdateRedis: filledOrderUpdateRedis,
  placeOrderAndUpdateRedis: placeOrderAndUpdateRedis,
  getNewOrderPriceAndSide: getNewOrderPriceAndSide,
  getUuidBySymbolAndPrice: getUuidBySymbolAndPrice,
  checkAndPlaceMissOrders: checkAndPlaceMissOrders,
}
