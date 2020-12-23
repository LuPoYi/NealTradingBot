const inquirer = require('inquirer')
const mainGridTrading = require('./lib/gridTrading')
const { redisClient, redisHGetAllAsync } = require('./lib/redisClient')
const {
  getLatestInformation,
  getPosition,
  getWalletBalance,
  changeUserLeverage,
  getUserLeverage,
} = require('./lib/restAPI')
const { websocketSubscribe } = require('./lib/websocket')
const { printOutCurrentGridTrading } = require('./lib/utils/helper')

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
  const userLeverages = await getUserLeverage()

  for (let coin of coins) {
    console.group(coin)
    const symbol = `${coin}USD`
    const latestPrice = await getLatestInformation(symbol)
    console.log(`Latest Price: ${latestPrice}`)

    const balance = await getWalletBalance(coin)
    console.log(
      `Available Balance: ${balance?.available_balance} ${coin} => ${parseInt(
        latestPrice * balance?.available_balance
      )} USD`
    )

    const leverage = userLeverages?.[symbol]?.leverage
    console.log(`Current Leverage: ${leverage}x`)
    if (leverage !== 1) {
      const newLeverage = await changeUserLeverage(1, symbol)
      console.log(`Update Leverage to: ${newLeverage}x`)
    }

    const position = await getPosition(symbol)
    console.log(
      `${symbol} ${position?.side} Position: Qty: ${position?.size} Value: ${position?.position_margin}`
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
          //'Account 倉位及餘額',
          'GridTrading 網格單',
          'WebSocket 開啟(會持續追踨已設定價位並下單)',
        ],
      },
    ])
    .then((answers) => {
      let action = answers.action.split(' ')[0]
      switch (action) {
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
    message: 'Continue?',
    default: false,
  })

  // 4. main
  if (checkPoint.isContinue) {
    mainInquirer()
  }
}

main()
