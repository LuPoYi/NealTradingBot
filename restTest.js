const { RestClient } = require('@pxtrn/bybit-api')
const inquirer = require('inquirer')

const dotenv = require('dotenv')
dotenv.config()

const ENV = process.env.API_KEY
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY

console.log(`ENV ${ENV}`)
console.log(`API_KEY ${API_KEY}`)
console.log(`PRIVATE_KEY ${PRIVATE_KEY}`)

const client = new RestClient(API_KEY, PRIVATE_KEY)

// console.log('getLatestInformation')
// client.getLatestInformation({ symbol: 'BTCUSD' }).then((data) => {
//   console.log('data', data)
// })

client
  .getActiveOrder({ symbol: 'ETHUSD', limit: 50 })
  .then((result) => {
    console.log('getActiveOrder', result.result.data)
  })
  .catch((err) => {
    console.error(error)
  })

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
