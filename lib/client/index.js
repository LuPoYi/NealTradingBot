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
  restClient,
  redisClient,
  redisGetAsync,
  redisSetAsync,
  redisHGetAsync,
  redisHSetAsync,
  redisHGetAllAsync,
}
