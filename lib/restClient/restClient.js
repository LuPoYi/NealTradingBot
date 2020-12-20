const { RestClient } = require('bybit-api')
const dotenv = require('dotenv')
dotenv.config()

const ENV = process.env.API_KEY
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY

console.log('API_KEY', API_KEY)
const restClient = new RestClient(API_KEY, PRIVATE_KEY)

module.exports = restClient
