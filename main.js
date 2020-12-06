const inquirer = require('inquirer')
const chalk = require('chalk')
const mainGridTrading = require('./lib/gridTrading')
const { redisClient, redisHGetAllAsync } = require('./lib/redisClient')
const {
  getLatestInformation,
  getPosition,
  getWalletBalance,
  changeUserLeverage,
} = require('./lib/restAPI')
const { websocketSubscribe } = require('./lib/websocket')
const {
  printOutCurrentGridTrading,
  logColors,
  systemLog,
  apiLog,
  wsLog,
  errorLog,
} = require('./lib/utils/helper')
const { primary, success, info, warning, error } = logColors

const checkRedis = () => {
  return new Promise((resolve, reject) => {
    try {
      redisClient.set('foo', Date.now())
      redisClient.get('foo', (error, result) => {
        if (error) {
          throw error
        }
        resolve('[Check] Redis OK', result)
      })
    } catch (err) {
      reject('[Check] Redis Fail', err)
    }
  })
}

const checkCurrentStatus = async (coins) => {
  for (let coin of coins) {
    console.group(primary(coin))
    const symbol = `${coin}USD`
    const latestPrice = await getLatestInformation(symbol)
    console.log(`最新成交價 ${warning(latestPrice)}`)

    const balance = await getWalletBalance(coin)
    console.log(`可用餘額 ${warning(balance?.available_balance)}`)

    const position = await getPosition(symbol)
    console.log(
      `${symbol} ${position?.side} 倉位: Qty: ${position?.size} Value: ${position?.position_margin}`
    )
    console.groupEnd()
  }
}

const mainInquirer = () => {
  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'action',
        message: '要幹麻?',
        choices: [
          'Account 倉位及餘額',
          'GridTrading 網格單',
          'WebSocket 開啟(會持續追踨已設定價位並下單)',
        ],
      },
    ])
    .then((answers) => {
      let action = answers.action.split(' ')[0]
      switch (action) {
        case 'Account':
          getWalletBalance('BTC')
          getWalletBalance('ETH')
          changeUserLeverage(1, 'BTCUSD')
          changeUserLeverage(1, 'ETHUSD')
          break
        case 'GridTrading':
          mainGridTrading()
          break
        case 'WebSocket':
          websocketSubscribe()
        default:
          break
      }
    })
}

const main = async () => {
  systemLog('systemLog')
  apiLog('apiLog')
  wsLog('wsLog')
  errorLog('errorLog')

  // 1. check redis connection
  const isRedisOK = await checkRedis()
  console.log(isRedisOK)

  // 2. check current status
  await checkCurrentStatus(['BTC', 'ETH'])

  // 3. check current grid tradings
  const gridTradingResult = await redisHGetAllAsync('gridTrading')
  await printOutCurrentGridTrading(gridTradingResult)

  // 3. just a stop
  const checkPoint = await inquirer.prompt({
    type: 'confirm',
    name: 'isContinue',
    message: '是否要繼續?',
    default: false,
  })

  // 4. main
  if (checkPoint.isContinue) {
    mainInquirer()
  }
}

main()
