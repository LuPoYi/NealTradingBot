const { restClient } = require('../restClient')

function getWalletBalance(coin) {
  return new Promise(function (resolve, reject) {
    restClient
      .getWalletBalance({ coin: coin })
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          resolve(data['result'][coin])
        } else {
          console.log('ERROR1:', data)
          reject({})
        }
      })
      .catch((err) => {
        console.log('ERROR2:', err)
        reject({})
      })
  })
}

function getUserLeverage() {
  return new Promise(function (resolve, reject) {
    restClient
      .getUserLeverage()
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          resolve(data['result'])
        } else {
          console.log('getUserLeverage Fail:', data)
          reject({})
        }
      })
      .catch((err) => {
        console.error('getUserLeverage Error:', err)
        reject({})
      })
  })
}

const changeUserLeverage = (leverage, symbol) => {
  return new Promise(function (resolve, reject) {
    restClient
      .changeUserLeverage({ leverage: leverage, symbol: symbol })
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK' && data['result'] === leverage) {
          resolve(leverage)
        } else {
          console.log('changeUserLeverage Fail:', data)
          reject({})
        }
      })
      .catch((err) => {
        console.error('changeUserLeverage Error:', err)
        reject({})
      })
  })
}

module.exports = {
  getWalletBalance: getWalletBalance,
  getUserLeverage: getUserLeverage,
  changeUserLeverage: changeUserLeverage,
}
