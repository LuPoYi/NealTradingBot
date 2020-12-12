const TelegramBot = require('node-telegram-bot-api')

const dotenv = require('dotenv')
dotenv.config()

const sendTelegramMessage = (message) => {
  if (process.env.TelegramBotToken && process.env.TelegramChatID) {
    const bot = new TelegramBot(process.env.TelegramBotToken)
    bot?.sendMessage(process.env.TelegramChatID, message)
  }
}

module.exports = {
  sendTelegramMessage: sendTelegramMessage,
}
