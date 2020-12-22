const { WebsocketClient, DefaultLogger } = require('bybit-api')
const { redisHGetAsync, redisHKeysAsync } = require('../redisClient')
const { loggerWS, logger } = require('../utils/logger')
const {
  processPositionMessage,
  filledOrderUpdateRedis,
  placeOrderAndUpdateRedis,
  getNewOrderPriceAndSide,
  getUuidBySymbolAndPrice,
  checkAndPlaceMissOrders,
} = require('./helper')
const { sendTelegramMessage } = require('../utils/telegramBot')
const { wsLog } = require('../utils/helper')

const websocketSubscribe = () => {
  logger.info('Websocket', 'Subscribe!')

  const dotenv = require('dotenv')
  dotenv.config()

  DefaultLogger.silly = () => {}

  const wsConfig = {
    key: process.env.API_KEY,
    secret: process.env.PRIVATE_KEY,
    // livenet: true
    // wsUrl: 'wss://stream.bytick.com/realtime'
  }
  const ws = new WebsocketClient(wsConfig, DefaultLogger)

  ws.subscribe(['order'])
  // ws.subscribe(['position', 'order'])

  ws.on('open', function () {
    sendTelegramMessage('[websocket] connection open')
    loggerWS.debug('[websocket] connection open')
    logger.debug('[websocket] connection open')
  })

  ws.on('update', async function (message) {
    switch (message?.topic) {
      case 'position':
        processPositionMessage(message?.data)
        break
      case 'order':
        loggerWS.debug('[order]', message)
        let uuid
        for (const data of message?.data) {
          let { order_id, symbol, side, price, order_status } = data
          price = parseFloat(price)

          sendTelegramMessage(`[Order] ${order_id} ${symbol} ${side} ${price} ${order_status}`)

          if (order_status !== 'Filled' || !['Buy', 'Sell'].includes(side)) {
            continue
          }

          const gridTradingKeys = await redisHKeysAsync('gridTrading')
          // ['20201212_ETHUSD_300_600_abcdef']

          uuid = getUuidBySymbolAndPrice(gridTradingKeys, symbol, price)
          if (!uuid) {
            continue
          }
          const result = await redisHGetAsync('gridTrading', uuid)
          if (!result) {
            continue
          }

          let gridTradingObject = JSON.parse(result)
          const priceList = gridTradingObject?.settings?.priceList.sort((a, b) => b - a)
          const currentOrderIDs =
            side === 'Buy'
              ? gridTradingObject.currentOrderBuyIDs
              : gridTradingObject.currentOrderSellIDs

          if (priceList?.includes(price) && currentOrderIDs.includes(order_id)) {
            // get Filled Order And Update Redis
            await filledOrderUpdateRedis({ uuid: uuid, data: data })

            // should place new order or not
            const { isShouldPlaceNewOrder, newPrice, newSide } = getNewOrderPriceAndSide({
              price,
              side,
              priceList,
            })

            if (isShouldPlaceNewOrder && newPrice) {
              // Place order And Update Redis
              placeOrderAndUpdateRedis({
                uuid: uuid,
                side: newSide,
                price: newPrice,
                source_order_id: order_id,
              })
            } else {
              console.log('[Redis] dont need place new order', priceList, price)
            }
          } else {
            console.log('[Redis] isNotExist', order_id, priceList, price, gridTradingObject)
          }
        }
        if (uuid) {
          checkAndPlaceMissOrders({ uuid: uuid })
        }

        break
      default:
        loggerWS.debug('[others]', message)
    }
  })

  ws.on('response', function (response) {
    console.log('[websocket] response', response)
    loggerWS.debug('[websocket] response', response)
  })

  ws.on('close', function () {
    console.log('[websocket] connection closed')
    loggerWS.debug('[websocket] connection closed')
  })

  ws.on('error', function (err) {
    console.error('[websocket] ERR', err)
    loggerWS.debug('[websocket] ERR', err)
  })
}

module.exports = websocketSubscribe
