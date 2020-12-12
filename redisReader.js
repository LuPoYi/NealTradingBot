const redis = require('redis')
const client = redis.createClient() // this creates a new client

console.log('hkeys', client.hkeys('gridTrading'))
