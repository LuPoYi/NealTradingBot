const mainGridTrading = require('./lib/gridTrading')
const { getLatestInformation } = require('./lib/rest/market')
const { accountInfo, getUserLeverage, changeUserLeverage } = require('./lib/rest/account')
const { wsClient, restClient, redisClient } = require('./lib/client')
const inquirer = require('inquirer')

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

const checkRest = () => {
  return new Promise((resolve, reject) => {
    restClient
      .getLatestInformation()
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          last_price = data['result'].find((item) => item.symbol === 'BTCUSD')?.last_price
          resolve('[Check] Rest API OK', last_price)
        } else {
          throw error
        }
      })
      .catch((err) => {
        reject('[Check] Rest API Fail', err)
      })
  })
}

const checkCurrentOrders = () => {
  // redis - GridTrading

  // TODO: redisClient.hgetall('gridTrading', function (_, results) {})

  // bybit - current Order

  // TODO: restClient.getActiveOrder
  // ...and then
  // TODO: restClient.placeActiveOrder

  return 'A'
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
          'Order 未成交訂單',
          'History 已成交訂單',
          'Market 最新成交價',
          'GridTrading 網格單',
        ],
      },
    ])
    .then((answers) => {
      let action = answers.action.split(' ')[0]
      switch (action) {
        case 'Account':
          accountInfo('BTC')
          // changeUserLeverage(5, 'ETHUSD')
          // getUserLeverage()
          break
        case 'Order':
          break
        case 'History':
          break
        case 'GridTrading':
          mainGridTrading()
          break
        case 'Market':
          getLatestInformation('BTCUSD').then((price) => {
            console.log('price', price)
          })
          break
        default:
          break
      }
    })
}

const remindInquirer = (gridTradingSet) => {
  Object.keys(gridTradingSet).map((uuid) => {
    const obj = JSON.parse(gridTradingSet[uuid])

    console.log(uuid, obj?.settings?.priceList)
  })

  inquirer
    .prompt([
      {
        type: 'checkbox',
        name: 'uuids',
        message: '目前網格: 請選擇要移除的項目，未刪除的網格下一步會繼續追蹤價位並下單',
        choices: Object.keys(gridTradingSet),
      },
    ])
    .then((answers) => {
      let uuids = answers.uuids
      console.log('uuids', uuids)
      uuids.forEach((uuid) => {
        redisClient.hdel('gridTrading', uuid)
        // TODO: 刪bybit order restClient.placeActiveOrder
      })
      mainInquirer()
    })
}

const main = async () => {
  // check redis connection
  const isRedisOK = await checkRedis()
  console.log(isRedisOK)

  // check bybit api
  const isRestOK = await checkRest()
  console.log(isRestOK)

  // check current orders JSON.stringify
  let gridTradingSet

  redisClient.hgetall('gridTrading', function (_, results) {
    if (results) {
      remindInquirer(results)
    } else {
      console.log('目前尚無網格單')
      mainInquirer()
    }
  })
  // mainInquirer()
}

main()

// {
//   "pair": "ETH/USDT - USDT",
//   "high": "10000",
//   "low": "8000",
//   "grids": "20",
//   "totalAmount": "1"
// }

// -d '{"api_key":"{api_key}","side"="Buy",
// "symbol"="BTCUSD","order_type":"Market","qty":10,
// "time_in_force":"GoodTillCancel","timestamp":{timestamp},
// "sign":"{sign}"}'

// assert(params, 'No params passed');
// assert(params.side, 'Parameter side is required');
// assert(params.symbol, 'Parameter symbol is required');
// assert(params.order_type, 'Parameter order_type is required');
// assert(params.qty, 'Parameter qty is required');
// assert(params.time_in_force, 'Parameter time_in_force is required');

// processGridTrading({
//   symbol: 'BTC/USDT - USDT',
//   side: 'Buy - Long',
//   high: '0.9',
//   low: '0.7',
//   grids: '10',
//   totalAmount: '6000',
// })
