const { WebsocketClient, DefaultLogger } = require('bybit-api')
const { redisHGetAsync, redisHKeysAsync } = require('../redisClient')
const {
  filledOrderUpdateRedis,
  placeOrderAndUpdateRedis,
  getNewOrderPriceAndSide,
  getUuidBySymbolAndPrice,
  checkAndPlaceMissOrders,
} = require('./helper')

const websocketSubscribe = () => {
  console.log('Websocket', 'Subscribe!')

  const dotenv = require('dotenv')
  dotenv.config()

  DefaultLogger.silly = () => {}

  const wsConfig = {
    key: process.env.API_KEY,
    secret: process.env.PRIVATE_KEY,
  }
  const ws = new WebsocketClient(wsConfig, DefaultLogger)

  ws.subscribe(['order'])

  ws.on('open', function () {
    console.log('websocket open')
  })

  ws.on('update', async function (message) {
    switch (message?.topic) {
      case 'order': {
        let uuid
        for (const data of message?.data) {
          let { order_id, symbol, side, price, order_status } = data
          price = parseFloat(price)

          if (order_status !== 'Filled' || !['Buy', 'Sell'].includes(side)) {
            continue
          }

          // ['20201212_ETHUSD_300_600_abcdef']
          const gridTradingKeys = await redisHKeysAsync('gridTrading')

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

          if (priceList?.includes(price)) {
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
              await placeOrderAndUpdateRedis({
                uuid: uuid,
                side: newSide,
                price: newPrice,
              })
            } else {
              console.log('[Redis] dont need place new order', priceList, price)
            }
          } else {
            console.log('[Redis] isNotExist', order_id, priceList, price, gridTradingObject)
          }
        }

        if (uuid) {
          await checkAndPlaceMissOrders({ uuid: uuid })
        }

        break
      }
      default:
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
