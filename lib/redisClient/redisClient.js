const redis = require('redis')
const { promisify } = require('util')
const client = redis.createClient() // this creates a new client

const setAsync = promisify(client.set).bind(client)
const getAsync = promisify(client.get).bind(client)

const hgetAsync = promisify(client.hget).bind(client)
const hsetAsync = promisify(client.hset).bind(client)

const hgetallAsync = promisify(client.hgetall).bind(client)

module.exports = {
  redisClient: client,
  redisGetAsync: getAsync,
  redisSetAsync: setAsync,
  redisHGetAsync: hgetAsync,
  redisHSetAsync: hsetAsync,

  redisHGetAllAsync: hgetallAsync,
}
