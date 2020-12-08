const log4js = require('log4js')

log4js.configure({
  appenders: {
    server: { type: 'file', filename: 'server.log' },
    api: { type: 'file', filename: 'api.log' },
    ws: { type: 'file', filename: 'ws.log' },
    console: { type: 'console' },
  },
  categories: {
    server: { appenders: ['server'], level: 'debug' },
    API: { appenders: ['api'], level: 'debug' },
    WS: { appenders: ['ws'], level: 'debug' },
    default: { appenders: ['console', 'server'], level: 'trace' },
  },
})

const logger = log4js.getLogger()
const loggerServer = log4js.getLogger('server')
const loggerAPI = log4js.getLogger('API')
const loggerWS = log4js.getLogger('WS')

module.exports = {
  logger: logger,
  loggerServer: loggerServer,
  loggerAPI: loggerAPI,
  loggerWS: loggerWS,
}

// logger.debug => console and server.log
// loggerServer.debug => only server.js
// loggerAPI.debug => only api.js
// loggerWS.debug => only ws.js

// var logger = log4js.getLogger('example');
// const logger = log4js.getLogger('cheese')
// logger.trace('Entering cheese testing')
// logger.debug('Got cheese.')
// logger.info('Cheese is Comté.')
// logger.warn('Cheese is quite smelly.')
// logger.error('Cheese is too ripe!')
// logger.fatal('Cheese was breeding ground for listeria.')
