const { RestClient } = require('@pxtrn/bybit-api')
const dotenv = require('dotenv')
dotenv.config()

const ENV = process.env.API_KEY
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY

const client = new RestClient(API_KEY, PRIVATE_KEY)

const placeActiveOrder = ({
  side,
  symbol,
  order_type,
  price,
  qty,
  time_in_force,
  reduce_only,
  close_on_trigger,
}) => {
  client
    .placeActiveOrder({
      side,
      symbol,
      order_type,
      price,
      qty,
      time_in_force,
      reduce_only,
      close_on_trigger,
    })
    .then((data) => {
      if (data['ret_msg'].toString().toUpperCase() === 'OK') {
        console.log('OK', data)
      } else {
        console.log('somethings wrong:', data)
      }
    })
    .catch((err) => {
      console.error(err)
    })
}

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

// cancelActiveOrder({ symbol: 'BTCUSD', order_id: 'c4647b56-10e9-47f5-95a3-1ce94eea441e' })

// placeActiveOrder({
//   side: 'Buy',
//   symbol: 'BTCUSD',
//   order_type: 'Limit',
//   price: 9666,
//   qty: 8,
//   time_in_force: 'GoodTillCancel',
//   reduce_only: false,
//   close_on_trigger: false,
// })
// module.exports = {
//   getActiveOrder: getActiveOrder,
// }

getActiveOrder()

// Place Order API respons =>
// OK {
//   ret_code: 0,
//   ret_msg: 'OK',
//   ext_code: '',
//   ext_info: '',
//   result: {
//     user_id: 131263,
//     order_id: '106cf585-a609-4cce-bb3e-74a056cd7418',
//     symbol: 'BTCUSD',
//     side: 'Buy',
//     order_type: 'Limit',
//     price: 9666,
//     qty: 8,
//     time_in_force: 'GoodTillCancel',
//     order_status: 'Created',
//     last_exec_time: 0,
//     last_exec_price: 0,
//     leaves_qty: 8,
//     cum_exec_qty: 0,
//     cum_exec_value: 0,
//     cum_exec_fee: 0,
//     reject_reason: 'EC_NoError',
//     order_link_id: '',
//     created_at: '2020-11-05T13:54:17.074Z',
//     updated_at: '2020-11-05T13:54:17.074Z'
//   },
//   time_now: '1604584457.075340',
//   rate_limit_status: 99,
//   rate_limit_reset_ms: 1604584457072,
//   rate_limit: 100
// }