const { RestClient } = require('@pxtrn/bybit-api')
const inquirer = require('inquirer')

const dotenv = require('dotenv')
dotenv.config()

// const ENV = process.env.API_KEY
// const API_KEY = process.env.API_KEY
// const PRIVATE_KEY = process.env.PRIVATE_KEY

// console.log(`ENV ${ENV}`)
// console.log(`API_KEY ${API_KEY}`)
// console.log(`PRIVATE_KEY ${PRIVATE_KEY}`)

//const client = new RestClient(API_KEY, PRIVATE_KEY)

// client
//   .changeUserLeverage({ leverage: 10, symbol: 'ETHUSD' })
//   .then((result) => {
//     console.log(result)
//   })
//   .catch((err) => {
//     console.error(error)
//   })
const processGridTrading = ({ symbol, high, low, grids, totalAmount }) => {
  console.log('processGridTrading', grids, high)
  let orderList = []
  const distance = (high - low) / (grids - 1)

  for (let i = 0; i < grids; i++) {
    console.log(`No.${i + 1}`, high - distance * i)
  }
}

// processGridTrading({
//   symbol: 'BTC/USDT - USDT',
//   side: 'Buy - Long',
//   high: '0.9',
//   low: '0.7',
//   grids: '10',
//   totalAmount: '6000',
// })

inquirer
  .prompt([
    {
      type: 'rawlist',
      name: 'symbol',
      message: '請選擇交易對',
      choices: [
        'BTC/USDT - USDT',
        'ETH/USDT - USDT',
        new inquirer.Separator(),
        'BTC/USDT - Inverse',
        'ETH/USDT - Inverse',
      ],
    },
    {
      type: 'rawlist',
      name: 'side',
      choices: ['Buy - Long', 'Sell - Short'],
    },
    {
      type: 'input',
      name: 'high',
      message: '網格區間上限',
    },
    {
      type: 'input',
      name: 'low',
      message: '網格區間下限',
    },
    {
      type: 'input',
      name: 'grids',
      message: '網格數量',
    },
    {
      type: 'input',
      name: 'totalAmount',
      message: '總投資額度',
    },
  ])
  .then((answers) => {
    console.log(JSON.stringify(answers, null, '  '))
    processGridTrading(answers)
  })

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
