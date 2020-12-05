const { getWalletBalance, getUserLeverage, changeUserLeverage } = require('./account')
const { getLatestInformation } = require('./market')
const { placeActiveOrder, getActiveOrder, cancelActiveOrder, getPosition } = require('./order')

module.exports = {
  getWalletBalance,
  getUserLeverage,
  changeUserLeverage,
  getLatestInformation,
  placeActiveOrder,
  getActiveOrder,
  cancelActiveOrder,
  getPosition,
}
