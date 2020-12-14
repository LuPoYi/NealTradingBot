const TelegramBot = require('node-telegram-bot-api')

const dotenv = require('dotenv')
dotenv.config()

const sendTelegramMessage = (message) => {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN)
    bot?.sendMessage(process.env.TELEGRAM_CHAT_ID, `${process.env.NAME}: ${message}`)
  }
}

module.exports = {
  sendTelegramMessage: sendTelegramMessage,
}
