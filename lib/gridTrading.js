const inquirer = require('inquirer')
const {
  redisClient,
  redisHGetAllAsync,
  redisHSetAsync,
  redisHGetAsync,
  redisHDelAsync,
} = require('./redisClient')
const {
  getWalletBalance,
  getLatestInformation,
  placeActiveOrder,
  cancelActiveOrder,
} = require('./restAPI')
const { gridTradingInquirerPrompt } = require('./constants/inquirerPrompt')
const { websocketSubscribe } = require('./websocket')
const {
  buildGridTradingSettings,
  printOutCurrentGridTrading,
  getDateString,
} = require('./utils/helper')
const { loggerServer } = require('./utils/logger')

const mainGridTrading = async () => {
  const answers = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'action',
      message: 'Grid Trading',
      choices: ['Create', 'Cancel'],
    },
  ])

  const action = answers.action.split(' ')[0]
  switch (action) {
    case 'Create':
      gridTradingInput()
      break
    case 'Cancel':
      const gridTradingResult = await redisHGetAllAsync('gridTrading')
      printOutCurrentGridTrading(gridTradingResult)
      if (gridTradingResult) {
        removeGridTradingInquirer(gridTradingResult)
      }
      break
    default:
      break
  }
}

// 網格單前處理
const gridTradingInput = async () => {
  const answers = await inquirer.prompt(gridTradingInquirerPrompt)
  const symbol = answers.symbol // BTCUSD
  const coin = symbol.replace(/USD$/, '')
  const gridTradingSettings = buildGridTradingSettings(answers)

  // 20201212_ETHUSD_300_600_abcdef
  const uuid = `${getDateString()}_${answers.symbol}_${answers.low}_${
    answers.high
  }_${Math.random().toString(36).substring(7)}`

  // set redis
  redisClient.hset(
    'previewGridTrading',
    uuid,
    JSON.stringify({
      settings: gridTradingSettings,
    })
  )

  console.log('--------Grid Trading Init--------')
  console.log(gridTradingSettings)
  console.log('--------Grid Trading Init--------')

  const balances = await getWalletBalance(coin)
  console.log(coin, 'Available Balance:', balances?.available_balance, coin)
  const latestPrice = await getLatestInformation(`${coin}USD`)

  // 找出離最新成交價最近的網格
  const closestPrice = gridTradingSettings.priceList.reduce((prev, curr) =>
    Math.abs(curr - latestPrice) < Math.abs(prev - latestPrice) ? curr : prev
  ) // 16082 => 16200

  const qty = gridTradingSettings.qty
  let marketOrderCount = 0
  let limitClosePrice = [] // buy
  let limitOpenPrice = [] // sell

  gridTradingSettings.priceList.forEach((price) => {
    if (price > closestPrice) {
      limitOpenPrice.push(price)
    } else if (price < closestPrice) {
      limitClosePrice.push(price)
    }
  })
  marketOrderCount = limitClosePrice.length

  console.log(
    `It will do...
     Market Sell Qty: ${marketOrderCount} 
     > Default Qty: -${qty * marketOrderCount}
     `
  )
  console.log(
    `
    > Limit Sell Price: ${limitOpenPrice.join(' ')}
    > Limit Buy Price: ${limitClosePrice.join(' ')}
    `
  )

  const subAnswers = await inquirer.prompt({
    type: 'confirm',
    name: 'isConfirm',
    message: 'Are you sure?',
    default: false,
  })

  if (subAnswers.isConfirm) {
    console.log('Start Trading!')
    await gridTradingExecute(uuid, marketOrderCount, limitClosePrice, limitOpenPrice)
    websocketSubscribe()
  } else {
    console.log('Do nothing')
  }
}

const gridTradingExecute = async (uuid, marketOrderCount, limitClosePrice, limitOpenPrice) => {
  const previewGridTradingResult = await redisHGetAsync('previewGridTrading', uuid)

  if (previewGridTradingResult) {
    let position = 0
    let allOrderResults = []
    let currentOrderBuyIDs = []
    let currentOrderSellIDs = []
    let filledOrderBuyIDs = []
    let filledOrderSellIDs = []
    let currentOrders = {}
    let gridTradingObject = JSON.parse(previewGridTradingResult)
    let { side, symbol, qty } = gridTradingObject.settings

    // 1. Place Sell Orders
    for (const price of limitOpenPrice) {
      const result = await placeActiveOrder({
        side: side,
        symbol: symbol,
        order_type: 'Limit',
        qty: qty,
        price: price,
        reduce_only: false,
      })
      currentOrders[price] = result.order_id
      allOrderResults.push(result)
      currentOrderSellIDs.push(result.order_id)
    }

    // 2. Place Buy Orders
    for (const price of limitClosePrice) {
      const result = await placeActiveOrder({
        side: 'Buy',
        symbol: symbol,
        order_type: 'Limit',
        qty: qty,
        price: price,
        reduce_only: false, // current position is zero, cannot fix reduce-only order qty
      })
      currentOrders[price] = result.order_id
      allOrderResults.push(result)
      currentOrderBuyIDs.push(result.order_id)
    }

    // 3. Do Default Position - Market Sell
    if (marketOrderCount !== 0) {
      const marketQty = parseInt(qty * marketOrderCount)

      const marketOrder = {
        side: side,
        symbol: symbol,
        order_type: 'Market',
        qty: marketQty,
      }

      const marketOrderResult = await placeActiveOrder(marketOrder)
      position = -marketQty
      allOrderResults.push(marketOrderResult)
      filledOrderSellIDs.push(marketOrderResult.order_id)
    }

    gridTradingObject = {
      ...gridTradingObject,
      position: position,
      currentOrders: currentOrders,
      allOrderResults: allOrderResults,
      currentOrderBuyIDs: currentOrderBuyIDs,
      currentOrderSellIDs: currentOrderSellIDs,
      filledOrderBuyIDs: filledOrderBuyIDs,
      filledOrderSellIDs: filledOrderSellIDs,
    }

    redisClient.hset('gridTrading', uuid, JSON.stringify(gridTradingObject))
    redisClient.hdel('previewGridTrading', uuid)
    loggerServer.debug('[Redis] move previewGridTrading to gridTrading', uuid, gridTradingObject)
  }
}

// 移除網格 ->
const removeGridTradingInquirer = async (gridTradingSet) => {
  inquirer
    .prompt([
      {
        type: 'list',
        name: 'uuid',
        message:
          'Which grid Tradning do you want to remove? This action will cancel the active orders and stop place new order. You should deal with the position by yourself',
        choices: Object.keys(gridTradingSet),
      },
    ])
    .then(async (answers) => {
      const gridTrading = await redisHGetAsync('gridTrading', answers.uuid)

      if (gridTrading) {
        await redisHDelAsync('gridTrading', answers.uuid)
        let gridTradingObject = JSON.parse(gridTrading)
        const symbol = gridTradingObject?.settings?.symbol
        let marketQty = 0

        // Cancel Buy Order
        for (let order_id of gridTradingObject.currentOrderBuyIDs) {
          const result = await cancelActiveOrder({
            symbol: symbol,
            order_id: order_id,
            side: 'Buy',
          })
          gridTradingObject.allOrderResults.push(result)
          gridTradingObject.currentOrderBuyIDs = gridTradingObject.currentOrderBuyIDs.filter(
            (x) => x !== order_id
          )
          marketQty += result?.qty || 0
        }

        // Cancel Sell Order
        for (let order_id of gridTradingObject.currentOrderSellIDs) {
          const result = await cancelActiveOrder({
            symbol: symbol,
            order_id: order_id,
            side: 'Sell',
          })
          gridTradingObject.allOrderResults.push(result)
          gridTradingObject.currentOrderSellIDs = gridTradingObject.currentOrderSellIDs.filter(
            (x) => x !== order_id
          )
        }

        await redisHSetAsync('finishedGridTrading', answers.uuid, JSON.stringify(gridTradingObject))
        console.log('Done!')
      }
    })
}

module.exports = mainGridTrading
