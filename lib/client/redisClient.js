const redis = require('redis')
const redisClient = redis.createClient() // this creates a new client
redisClient.on('connect', () => {
  // console.log('Redis client connected')
})
// redisClient.set('foo', 'bar', redis.print)
// redisClient.get('foo', (error, result) => {
//   if (error) {
//     console.log(error)
//     throw error
//   }
//   console.log('Redis client Test OK', result)
// })

module.exports = redisClient
