const { WebsocketClient } = require('@pxtrn/bybit-api')

const dotenv = require('dotenv')
dotenv.config()

const ENV = process.env.API_KEY
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY

console.log(`ENV ${ENV}`)
console.log(`API_KEY ${API_KEY}`)
console.log(`PRIVATE_KEY ${PRIVATE_KEY}`)

const ws = new WebsocketClient({ key: API_KEY, secret: PRIVATE_KEY })

ws.subscribe(['position', 'execution', 'order'])
// ws.subscribe('kline.BTCUSD.1m')

ws.on('open', function () {
  console.log('connection open')
})

ws.on('update', function (message) {
  // get data here
  switch (message?.topic) {
    case 'position':
      for (const data of message?.data) {
        const { symbol, size, side, entry_price, position_value } = data
        console.log(
          `[position] ${symbol} ${side} Qty: ${size} Entry Price: ${entry_price} Position Value: ${position_value}`
        )
      }

      break
    case 'execution':
      console.log('[execution]', message)
      // 訂單所有細節 -> 可能不需要
      // console.log('[execution]', message)
      // for (const data in message?.data) {
      //   const { order_id, exec_type, price, symbol, side, qty, cum_exec_qty, order_status } = data
      //   console.log(
      //     `[order] ${symbol} ${side} Price:${price}, Qty: ${cum_exec_qty}/${qty}, Status: ${order_status} - ${order_id}, Exec Type: ${exec_type}`
      //   )
      // }
      break
    case 'order':
      // 訂單狀態改變
      // status: [Cancelled New Filled]
      // need check order_id is Filled

      // when find order_type === Filled
      // send Rest.GetActiveOrder to check current Orders
      // and then Rest.placeAnOrder (if needed)
      console.log('[order]', message)
      for (const data of message?.data) {
        const { order_id, order_type, price, symbol, side, qty, cum_exec_qty, order_status } = data
        console.log(
          `[order] ${symbol} ${side}, Order type: ${order_type}, Price:${price}, Qty: ${cum_exec_qty}/${qty}, Status: ${order_status} - ${order_id}`
        )
      }
      break
    default:
      console.log('[others]', message)
  }
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

// Heartbeat Request
// ws.send('{"op":"ping"}')
// Heartbeat Response
// {
//   "success": true, // Whether ping is successful
//   "ret_msg": "pong",
//   "conn_id": "036e5d21-804c-4447-a92d-b65a44d00700",// current connection id
//   "request": {
//       "op": "ping",
//       "args": null
//   }
// }

// 下單/刪單 ->  order, position
// 直接下市價單吃掉倉位 -> order, execution, position

// --
// 直接下市價單吃掉倉位:
// [execution] {
//   topic: 'execution',
//   data: [
//     {
//       symbol: 'BTCUSD',
//       side: 'Sell',
//       order_id: '1296fc86-570d-4090-909f-a45c27dc4439',
//       exec_id: '54c1f9d7-61d2-5dd7-ab3c-1d5adbb143ba',
//       order_link_id: '',
//       price: '18334',
//       order_qty: 50,
//       exec_type: 'Trade',
//       exec_qty: 50,
//       exec_fee: '0.00000205',
//       leaves_qty: 0,
//       is_maker: false,
//       trade_time: '2020-11-22T09:18:39.526Z'
//     }
//   ]
// }

// 訂單成交:
// [execution] {
//   topic: 'execution',
//   data: [
//     {
//       symbol: 'BTCUSD',
//       side: 'Buy',
//       order_id: 'e11cb1f6-6772-4c90-b17b-90a177bd0419',
//       exec_id: 'da29c160-f635-5169-8a2c-39e113cba5a4',
//       order_link_id: '',
//       price: '18255',
//       order_qty: 50,
//       exec_type: 'Trade',
//       exec_qty: 50,
//       exec_fee: '-0.00000068',
//       leaves_qty: 0,
//       is_maker: true,
//       trade_time: '2020-11-22T09:22:16.736Z'
//     }
//   ]
// }
