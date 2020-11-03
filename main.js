const inquirer = require('inquirer')
const gridTradingInput = require('./rest/gridTrading')
const { accountInfo, getUserLeverage, changeUserLeverage } = require('./rest/account')
const { wsClient } = require('./websocket/websocket')

const dotenv = require('dotenv')
dotenv.config()

const main = () => {
  wsClient()

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
          'GridTrading 下網格單',
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
          gridTradingInput()
          break
        default:
          break
      }
    })
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
