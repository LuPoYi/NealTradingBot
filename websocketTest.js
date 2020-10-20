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

ws.subscribe(['position', 'execution', 'trade'])
ws.subscribe('kline.BTCUSD.1m')

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

// Heartbeat Request
ws.send('{"op":"ping"}')
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
