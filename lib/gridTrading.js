const inquirer = require('inquirer')
const { redisClient, redisHGetAllAsync, redisHGetAsync, redisHDelAsync } = require('./redisClient')
const { getWalletBalance, getLatestInformation, placeActiveOrder } = require('./restAPI')
const { gridTradingInquirerPrompt } = require('./constants/inquirerPrompt')
const websocket = require('./websocket')
const { websocketSubscribe } = require('./websocket')
const {
  buildGridTradingSettings,
  printOutCurrentGridTrading,
  logColors,
  apiLog,
  systemLog,
} = require('./utils/helper')
const { primary, success, info, warning, error, bid, ask } = logColors

const mainGridTrading = async () => {
  for (const coin of ['BTC', 'ETH']) {
    const latestPrice = await getLatestInformation(`${coin}USD`)
    console.log(`目前 ${coin} 最新成交價為: ${latestPrice}`)
    const balances = await getWalletBalance(coin)
    console.log(`${coin} 可用餘額: ${balances?.available_balance} ${coin}`)
    console.log(`目前合約數量最多約可下 ${parseInt(latestPrice * balances?.available_balance)} USD`)
    console.log('-------------------')
  }

  const answers = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'action',
      message: '網格單總覽',
      choices: [
        'Current 目前網格單',
        'History 歷史網格單',
        'GridTrading 下網格單',
        'Cancel 取消網格',
      ],
    },
  ])

  const action = answers.action.split(' ')[0]
  switch (action) {
    case 'Current':
      console.log(redisClient.hgetall('gridTrading'))
      break
    case 'History':
      console.log(redisClient.hgetall('historyGridTrading'))
      break
    case 'GridTrading':
      gridTradingInput()
      break
    case 'Cancel':
      const gridTradingResult = await redisHGetAllAsync('gridTrading')
      printOutCurrentGridTrading(gridTradingResult)
      removeGridTradingInquirer(gridTradingResult)
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

  const uuid = Math.random().toString(36).substring(7)

  // set redis
  redisClient.hset(
    'previewGridTrading',
    uuid,
    JSON.stringify({
      settings: gridTradingSettings,
      position: 0,
      currentOrders: {},
      allOrderResults: [],
      currentOrderBuyIDs: [],
      currentOrderSellIDs: [],
      filledOrderBuyIDs: [],
      filledOrderSellIDs: [],
    })
  )

  console.log('網格單初始設定完成')
  console.log('----------------')
  console.log(gridTradingSettings)
  console.log('----------------')

  const balances = await getWalletBalance(coin)
  console.log(coin, '可用餘額', balances?.available_balance, coin)

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

  console.log('將會執行')
  console.log(
    `Market Sell Qty: ${marketOrderCount} 
     目前最新成交價: ${latestPrice}
     初始倉位: -${qty * marketOrderCount}`
  )
  console.log(`Limit Sell Price: ${limitOpenPrice.join(' ')}`)
  console.log(`Limit Buy Price: ${limitClosePrice.join(' ')}`)

  const subAnswers = await inquirer.prompt({
    type: 'confirm',
    name: 'isConfirm',
    message: '是否確定要下此網格單?',
    default: false,
  })

  if (subAnswers.isConfirm) {
    console.log('開始下單!')
    await gridTradingExecute(uuid, marketOrderCount, limitClosePrice, limitOpenPrice)
    websocketSubscribe()
  } else {
    console.log('重新操作')
  }
}

// check user's balances
// place market order
// place limit close order
// place limit open order
// move redis previewGridTrading to gridTrading
const gridTradingExecute = async (uuid, marketOrderCount, limitClosePrice, limitOpenPrice) => {
  const previewGridTradingResult = await redisHGetAsync('previewGridTrading', uuid)

  if (previewGridTradingResult) {
    let position = 0
    let allOrderResults = []
    let currentOrders = {}
    let currentOrderBuyIDs = []
    let currentOrderSellIDs = []
    let filledOrderSellIDs = []
    let gridTradingObject = JSON.parse(previewGridTradingResult)
    let { side, symbol, qty } = gridTradingObject.settings

    if (marketOrderCount === 0) {
      apiLog('placeOrder', 'Market', ask('Sell'), 'skip')
    } else {
      const marketQty = qty * marketOrderCount // TODO: fix decimal

      const marketOrder = {
        side: side,
        symbol: symbol,
        order_type: 'Market',
        qty: marketQty,
      }

      apiLog('placeOrder', 'Market', ask('Sell'), `Qty: ${marketQty}`)
      const marketOrderResult = await placeActiveOrder(marketOrder)
      position = -marketQty
      allOrderResults.push(marketOrderResult)
      filledOrderSellIDs.push(marketOrderResult.order_id)
    }

    for (const price of limitOpenPrice) {
      apiLog('placeOrder', 'Limit', ask('Sell'), `Price: ${price} Qty: ${qty}`)

      const result = await placeActiveOrder({
        side: side,
        symbol: symbol,
        order_type: 'Limit',
        qty: qty,
        price: price,
        reduce_only: false,
      })
      currentOrders[price] = result
      allOrderResults.push(result)
      currentOrderSellIDs.push(result.order_id)
    }

    for (const price of limitClosePrice) {
      apiLog('placeOrder', 'Limit', bid('Buy'), `Price: ${price} Qty: ${qty}`)
      const result = await placeActiveOrder({
        side: 'Buy',
        symbol: symbol,
        order_type: 'Limit',
        qty: qty,
        price: price,
        reduce_only: false, // current position is zero, cannot fix reduce-only order qty
      })
      currentOrders[price] = result
      allOrderResults.push(result)
      currentOrderBuyIDs.push(result.order_id)
    }

    gridTradingObject.position = position
    gridTradingObject.currentOrders = currentOrders
    gridTradingObject.allOrderResults = allOrderResults
    gridTradingObject.currentOrderBuyIDs = currentOrderBuyIDs
    gridTradingObject.currentOrderSellIDs = currentOrderSellIDs
    gridTradingObject.filledOrderSellIDs = filledOrderSellIDs

    redisClient.hset('gridTrading', uuid, JSON.stringify(gridTradingObject))
    redisClient.hdel('previewGridTrading', uuid)
    systemLog('[Redis] move previewGridTrading to gridTrading')
  }
}

// 移除網格 ->
const removeGridTradingInquirer = async (gridTradingSet) => {
  inquirer
    .prompt([
      {
        type: 'list',
        name: 'uuid',
        message: '目前網格: 請選擇要移除的項目，會將Bybit的掛單及該倉位清空',
        choices: Object.keys(gridTradingSet),
      },
    ])
    .then(async (answers) => {
      const gridTrading = await redisHGetAsync('gridTrading', answers.uuid)

      if (gridTrading) {
        await redisHDelAsync('gridTrading', answers.uuid)
        let gridTradingObject = JSON.parse(gridTrading)

        // clean active order
        // TODO: 刪bybit order restClient.placeActiveOrder
        console.log('Done')
      }
    })
}

module.exports = mainGridTrading

// 開始下網格單並訂閱對應價位
// Check
//   redis - settings
//   websocket subscription
//   current order / position / balance
//
// Place order
//   when price is available & store response to redis
//
// Trading price & Trading my orders
//   - always place short order when currentPrice > one of price list
//   - when short-open order is filled, place long-close on next small price
//
