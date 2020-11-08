const { WebsocketClient } = require('@pxtrn/bybit-api')

const dotenv = require('dotenv')
dotenv.config()
// wss://stream-testnet.bybit.com/realtime
const ENV = process.env.API_KEY
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY

// console.log(`ENV ${ENV}`)
// console.log(`API_KEY ${API_KEY}`)
// console.log(`PRIVATE_KEY ${PRIVATE_KEY}`)

const wsClient = () => {
  const ws = new WebsocketClient({ key: API_KEY, secret: PRIVATE_KEY })

  ws.subscribe(['position', 'execution', 'order', 'stop_order'])

  ws.on('open', function () {
    console.log('connection open')
  })

  ws.on('update', function (message) {
    console.log('update', message)
  })

  ws.on('response', function (response) {
    console.log('response', response)
  })

  ws.on('close', function () {
    console.log('connection closed')
  })

  ws.on('error', function (err) {
    console.error('ERR', err)
  })
}

module.exports = {
  wsClient: wsClient,
}

// Place Order =>
//
// update {
//   topic: 'position',
//   data: [
//     {
//       user_id: 131263,
//       symbol: 'BTCUSD',
//       size: 0,
//       side: 'None',
//       position_value: '0',
//       entry_price: '0',
//       liq_price: '0',
//       bust_price: '0',
//       leverage: '3',
//       order_margin: '0.00068122',
//       position_margin: '0',
//       available_balance: '0.00117878',
//       take_profit: '0',
//       stop_loss: '0',
//       realised_pnl: '0',
//       trailing_stop: '0',
//       trailing_active: '0',
//       wallet_balance: '0.00186',
//       risk_id: 1,
//       occ_closing_fee: '0',
//       occ_funding_fee: '0',
//       auto_add_margin: 1,
//       cum_realised_pnl: '0',
//       position_status: 'Normal',
//       position_seq: 0
//     }
//   ]
// }
// update {
//   topic: 'order',
//   data: [
//     {
//       order_id: 'ec4215b2-c9aa-4188-96fa-e0870980980d',
//       order_link_id: '',
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_type: 'Limit',
//       price: '9777',
//       qty: 9,
//       time_in_force: 'GoodTillCancel',
//       create_type: 'CreateByUser',
//       cancel_type: '',
//       order_status: 'New',
//       leaves_qty: 9,
//       cum_exec_qty: 0,
//       cum_exec_value: '0',
//       cum_exec_fee: '0',
//       timestamp: '2020-11-03T15:04:39.427Z',
//       take_profit: '0',
//       stop_loss: '0',
//       trailing_stop: '0',
//       last_exec_price: '0'
//     }
//   ]
// }

// Cancel Order =>
//
// update {
//   topic: 'order',
//   data: [
//     {
//       order_id: 'ec4215b2-c9aa-4188-96fa-e0870980980d',
//       order_link_id: '',
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_type: 'Limit',
//       price: '9777',
//       qty: 9,
//       time_in_force: 'GoodTillCancel',
//       create_type: 'CreateByUser',
//       cancel_type: 'CancelByUser',
//       order_status: 'Cancelled',
//       leaves_qty: 0,
//       cum_exec_qty: 0,
//       cum_exec_value: '0',
//       cum_exec_fee: '0',
//       timestamp: '2020-11-03T15:05:46.934Z',
//       take_profit: '0',
//       stop_loss: '0',
//       trailing_stop: '0',
//       last_exec_price: '0'
//     }
//   ]
// }
// update {
//   topic: 'position',
//   data: [
//     {
//       user_id: 131263,
//       symbol: 'BTCUSD',
//       size: 0,
//       side: 'None',
//       position_value: '0',
//       entry_price: '0',
//       liq_price: '0',
//       bust_price: '0',
//       leverage: '3',
//       order_margin: '0.00037277',
//       position_margin: '0',
//       available_balance: '0.00148723',
//       take_profit: '0',
//       stop_loss: '0',
//       realised_pnl: '0',
//       trailing_stop: '0',
//       trailing_active: '0',
//       wallet_balance: '0.00186',
//       risk_id: 1,
//       occ_closing_fee: '0',
//       occ_funding_fee: '0',
//       auto_add_margin: 1,
//       cum_realised_pnl: '0',
//       position_status: 'Normal',
//       position_seq: 0
//     }
//   ]
// }

// Place Order =>
//
// update {
//   topic: 'position',
//   data: [
//     {
//       user_id: 131263,
//       symbol: 'BTCUSD',
//       size: 0,
//       side: 'None',
//       position_value: '0',
//       entry_price: '0',
//       liq_price: '0',
//       bust_price: '0',
//       leverage: '3',
//       order_margin: '0.0006501',
//       position_margin: '0',
//       available_balance: '0.0012099',
//       take_profit: '0',
//       stop_loss: '0',
//       realised_pnl: '0',
//       trailing_stop: '0',
//       trailing_active: '0',
//       wallet_balance: '0.00186',
//       risk_id: 1,
//       occ_closing_fee: '0',
//       occ_funding_fee: '0',
//       auto_add_margin: 1,
//       cum_realised_pnl: '0',
//       position_status: 'Normal',
//       position_seq: 0,
//       Isolated: true,
//       mode: 0,
//       position_idx: 0
//     }
//   ]
// }
// update {
//   topic: 'order',
//   data: [
//     {
//       order_id: '106cf585-a609-4cce-bb3e-74a056cd7418',
//       order_link_id: '',
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_type: 'Limit',
//       price: '9666',
//       qty: 8,
//       time_in_force: 'GoodTillCancel',
//       create_type: 'CreateByUser',
//       cancel_type: '',
//       order_status: 'New',
//       leaves_qty: 8,
//       cum_exec_qty: 0,
//       cum_exec_value: '0',
//       cum_exec_fee: '0',
//       timestamp: '2020-11-05T13:54:17.074Z',
//       take_profit: '0',
//       stop_loss: '0',
//       trailing_stop: '0',
//       last_exec_price: '0'
//     }
//   ]
// }
