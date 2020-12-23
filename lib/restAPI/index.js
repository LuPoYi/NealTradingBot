const { getWalletBalance, getUserLeverage, changeUserLeverage } = require('./account')
const { getLatestInformation } = require('./market')
const {
  placeActiveOrder,
  getActiveOrder,
  cancelActiveOrder,
  getPosition,
  queryActiveOrder,
} = require('./order')

module.exports = {
  getWalletBalance,
  getUserLeverage,
  changeUserLeverage,
  getLatestInformation,
  placeActiveOrder,
  getActiveOrder,
  queryActiveOrder,
  cancelActiveOrder,
  getPosition,
}
