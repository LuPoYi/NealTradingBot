const chalk = require('chalk')

// 整理網格價位設定
// BTC 最小間格為 0.5 round down
// ETH 最小間格為 0.05 round down
const buildGridTradingSettings = ({ side, symbol, high, low, grids, totalQty }) => {
  let minStep
  if (symbol === 'BTCUSD') {
    minStep = 0.5
  } else if (symbol === 'ETHUSD') {
    minStep = 0.05
  }

  let priceList = []
  const qty = parseInt(totalQty / grids)
  const step = parseFloat(parseFloat((high - low) / (grids - 1)).toFixed(2))
  const startAt = Math.floor(Date.now() / 1000)

  for (let i = 0; i < grids; i++) {
    // 599.48 => 599.45
    // 598.79 => 598.75
    // 604.31 => 604.30
    let price = high - step * i
    price = parseFloat(parseFloat(parseInt(price / minStep) * minStep).toFixed(2))

    priceList.push(price)
  }
  return {
    priceList,
    step,
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

// 顯示目前執行中網格
const printOutCurrentGridTrading = async (gridTradingResult) => {
  if (gridTradingResult) {
    console.log('Current Grid Tradings: ')

    for (const [key, result] of Object.entries(gridTradingResult)) {
      const resultObject = JSON.parse(result)
      const { step, side, symbol, high, low, grids, totalQty, qty } = resultObject?.settings || {}
      console.log(
        `#${key} ${symbol} ${side} ${low}->${high} Step:${step} Grids:${grids} Qty:${qty} Total Qty:${totalQty}`
      )
    }
  } else {
  }
}

const getDateString = () => {
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0') // January is 0!
  const yyyy = today.getFullYear()
  return `${yyyy}${mm}${dd}`
}

const logColors = {
  primary: chalk.blue.bold,
  success: chalk.green,
  info: chalk.cyan,
  warning: chalk.keyword('orange'),
  error: chalk.bold.red,
  bid: chalk.bold.green,
  ask: chalk.bold.red,
}

const systemLog = (...args) => {
  console.log(chalk.blue.bold(args.join(' ')))
}

const apiLog = (action, ...args) => {
  console.log(chalk.bgGreen.black(`[API]`), chalk.bgGreen.black(`[${action}]`), args.join(' '))
}

const wsLog = (channel, ...args) => {
  console.log(chalk.bgCyan.black(`[WS]`), chalk.bgCyan.black(`[${channel}]`), args.join(' '))
}

const errorLog = (...args) => {
  console.log(chalk.red.bold(args.join(' ')))
}

module.exports = {
  buildGridTradingSettings: buildGridTradingSettings,
  printOutCurrentGridTrading: printOutCurrentGridTrading,
  systemLog: systemLog,
  apiLog: apiLog,
  wsLog: wsLog,
  errorLog: errorLog,
  logColors: logColors,
  getDateString: getDateString,
}
