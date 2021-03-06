const { restClient } = require('../restClient')
const { apiLog, logColors } = require('../utils/helper')
const { primary, success, info, warning, error, bid, ask } = logColors
const { loggerAPI } = require('../utils/logger')

const placeActiveOrder = ({
  side,
  symbol,
  price,
  qty,
  order_type = 'Limit',
  time_in_force = 'GoodTillCancel',
  reduce_only = false,
  close_on_trigger = false,
}) => {
  let sideWithColor = side === 'Buy' ? bid('Buy') : ask('Sell')
  apiLog('placeOrder', symbol, sideWithColor, `Price: ${price}, Qty: ${qty}`)

  let params = {
    side,
    symbol,
    order_type,
    qty,
    time_in_force,
    reduce_only,
    close_on_trigger,
  }
  if (order_type !== 'Market') {
    params['price'] = price
  }

  return new Promise(function (resolve, reject) {
    restClient
      .placeActiveOrder(params)
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          loggerAPI.debug('[Place]', price, side, data.result)
          resolve(data.result)
        } else {
          throw data
        }
      })
      .catch((err) => {
        console.log('err', err)
        reject(err)
      })
  })
}

const getActiveOrder = ({ symbol, order_status = 'New', limit = 50 }) => {
  const params = { symbol, order_status, limit }

  return new Promise(function (resolve, reject) {
    restClient
      .getActiveOrder(params)
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          resolve(data.result)
        } else {
          throw data
        }
      })
      .catch((err) => {
        console.log('err', err)
        reject(err)
      })
  })
}

const cancelActiveOrder = ({ symbol: symbol, order_id: order_id, side: side }) => {
  let sideWithColor = side === 'Buy' ? bid('Buy') : ask('Sell')
  apiLog('cancelOrder', symbol, side, sideWithColor)
  const params = { symbol, order_id }

  return new Promise(function (resolve, reject) {
    restClient
      .cancelActiveOrder(params)
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          resolve(data.result)
        } else {
          throw data
        }
      })
      .catch((err) => {
        console.log('err', err)
        reject(err)
      })
  })
}

const getPosition = (symbol) => {
  return new Promise(function (resolve, reject) {
    restClient
      .getPosition({ symbol: symbol })
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          resolve(data.result)
        } else {
          throw data
        }
      })
      .catch((err) => {
        console.log('err', err)
        reject(err)
      })
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

// placeActiveOrder({
//   side: 'Buy',
//   symbol: 'BTCUSD',
//   order_type: 'Market',
//   qty: 15,
//   time_in_force: 'GoodTillCancel',
//   reduce_only: false,
//   close_on_trigger: false,
// })

// getActiveOrder()

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

module.exports = {
  placeActiveOrder: placeActiveOrder,
  getActiveOrder: getActiveOrder,
  cancelActiveOrder: cancelActiveOrder,
  getPosition: getPosition,
}
