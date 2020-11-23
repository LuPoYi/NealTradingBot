const wsClient = require('./wsClient')
const restClient = require('./restClient')
const {
  redisClient,
  redisGetAsync,
  redisSetAsync,
  redisHGetAsync,
  redisHSetAsync,
  redisHGetAllAsync,
} = require('./redisClient')

module.exports = {
  wsClient,
  restClient,
  redisClient,
  redisGetAsync,
  redisSetAsync,
  redisHGetAsync,
  redisHSetAsync,
  redisHGetAllAsync,
}
