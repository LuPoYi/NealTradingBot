const { RestClient } = require('@pxtrn/bybit-api')
const dotenv = require('dotenv')
dotenv.config()

const ENV = process.env.API_KEY
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY

const client = new RestClient(API_KEY, PRIVATE_KEY)

const getActiveOrder = () => {
  client
    .getActiveOrder()
    .then((data) => {
      if (data['ret_msg'].toString().toUpperCase() === 'OK') {
        data['result']['data'].map(({ symbol, order_type, side, price, qty, order_id }, index) =>
          console.log(index + 1, symbol, side, order_type, side, price, qty, order_id)
        )
      } else {
        console.log('somethings wrong:', data)
      }
    })
    .catch((err) => {
      console.error(err)
    })
}

const cancelActiveOrder = ({ symbol: symbol, order_id: order_id }) => {
  client
    .cancelActiveOrder({ symbol: symbol, order_id: order_id })
    .then((data) => {
      if (data['ret_msg'].toString().toUpperCase() === 'OK') {
        console.log('cancelActiveOrder', symbol, order_id, 'Done!')
      } else {
        console.log('somethings wrong:', data)
      }
    })
    .catch((err) => {
      console.error(err)
    })
}

cancelActiveOrder({ symbol: 'BTCUSD', order_id: 'c4647b56-10e9-47f5-95a3-1ce94eea441e' })
// module.exports = {
//   getActiveOrder: getActiveOrder,
// }
