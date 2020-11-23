const inquirer = require('inquirer')
const { redisClient, restClient, redisGetAsync, redisHGetAsync } = require('./client')
const { getLatestInformation } = require('./rest/market')
const { getWalletBalance } = require('./rest/account')
const { placeActiveOrder, getActiveOrder } = require('./rest/order')
const { gridTradingInquirerPrompt } = require('./constants/inquirerPrompt')

const mainGridTrading = async () => {
  const latestPrice = await getLatestInformation('BTCUSD')
  console.log('目前最新成交價為', latestPrice)
  const balances = await getWalletBalance('BTC')
  console.log('BTC 可用餘額', balances?.available_balance, 'BTC')
  console.log('目前合約數量最多約可下', parseInt(latestPrice * balances?.available_balance), 'USD')

  const answers = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'action',
      message: '網格單總覽',
      choices: ['Current 目前網格單', 'History 歷史網格單', 'GridTrading 下網格單'],
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
    default:
      break
  }
}

// 網格單前處理
const gridTradingInput = async () => {
  const answers = await inquirer.prompt(gridTradingInquirerPrompt)

  const uuid = Math.random().toString(36).substring(7)
  const gridTradingSettings = buildGridTradingSettings(answers)

  // set redis
  redisClient.hset(
    'previewGridTrading',
    uuid,
    JSON.stringify({
      settings: gridTradingSettings,
      currentPosition: {},
      currentOrders: {},
      filledOrderIDs: [],
      orderCount: 0,
      allOrderResults: [],
    })
  )

  console.log('網格單初始設定完成')
  console.log('----------------')
  console.log(gridTradingSettings)
  console.log('----------------')
  const latestPrice = await getLatestInformation('BTCUSD')
  console.log('目前最新成交價為', latestPrice)
  const balances = await getWalletBalance('BTC')
  console.log('BTC 可用餘額', balances?.available_balance, 'BTC')
  console.log('----------------')

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
    `[Market][Sell] ${qty} BTC * ${marketOrderCount} -> 目前價位為 ${latestPrice}，初始posistion為 -${
      qty * marketOrderCount
    }`
  )
  console.log('[Limit][Buy][Close] 價位分別為', limitClosePrice)
  console.log('[Limit][Sell][Open] 價位分別為', limitOpenPrice)

  const subAnswers = await inquirer.prompt({
    type: 'confirm',
    name: 'isConfirm',
    message: '是否確定要下此網格單?',
    default: false,
  })

  if (subAnswers.isConfirm) {
    console.log('開始下單!')
    gridTradingExecute(uuid, marketOrderCount, limitClosePrice, limitOpenPrice)
  } else {
    console.log('重新操作')
  }
}

// 整理網格價位設定
const buildGridTradingSettings = ({ side, symbol, high, low, grids, totalQty }) => {
  let priceList = []
  const qty = totalQty / grids
  const distance = (high - low) / (grids - 1)
  const startAt = Math.floor(Date.now() / 1000)

  for (let i = 0; i < grids; i++) {
    priceList.push(high - distance * i)
  }
  return {
    priceList,
    side,
    symbol,
    high,
    low,
    grids,
    totalQty,
    qty,
    startAt,
  }
}

const gridTradingExecute = async (uuid, marketOrderCount, limitClosePrice, limitOpenPrice) => {
  // check user's balances
  // place market order! (in here?)
  // place limit close order
  // place limit open order
  // move redis previewGridTrading to gridTrading

  const previewGridTradingResult = await redisHGetAsync('previewGridTrading', uuid)

  if (previewGridTradingResult) {
    // do all the stuff...
    let allOrderResults = []
    let currentPosition = 0
    let currentOrders = {}
    let filledOrderIDs = []
    let gridTradingObject = JSON.parse(previewGridTradingResult)
    let { side, symbol, qty } = gridTradingObject.settings

    if (marketOrderCount === 0) {
      console.log('1. placeActiveOrder(Market) skip')
    } else {
      const marketQty = qty * marketOrderCount // TODO: fix decimal

      const marketOrder = {
        side: side,
        symbol: symbol,
        order_type: 'Market',
        qty: marketQty,
      }

      console.log('1. placeActiveOrder(Market)', marketOrder)
      const marketOrderResult = await placeActiveOrder(marketOrder)
      currentPosition = marketQty
      allOrderResults.push(marketOrderResult)
      filledOrderIDs.push(marketOrderResult.order_id)
    }
    console.log('2. placeActiveOrder(Close)', limitClosePrice)
    for (const price of limitClosePrice) {
      console.log('   placeActiveOrder(Close)', price)
      const result = await placeActiveOrder({
        side: 'Buy',
        symbol: symbol,
        order_type: 'Limit',
        qty: qty,
        price: price,
        reduce_only: true,
      })
      currentOrders[price] = result
      allOrderResults.push(result)
    }

    console.log('3. placeActiveOrder(Open)', limitOpenPrice)

    for (const price of limitOpenPrice) {
      console.log('   placeActiveOrder(Open)', price)
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
    }

    gridTradingObject.currentPosition = currentPosition
    gridTradingObject.currentOrders = currentOrders
    gridTradingObject.allOrderResults = allOrderResults
    gridTradingObject.filledOrderIDs = filledOrderIDs

    redisClient.hset('gridTrading', uuid, JSON.stringify(gridTradingObject))
    redisClient.hdel('previewGridTrading', uuid)
    console.log('[Redis] move previewGridTrading to gridTrading')
  }
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
