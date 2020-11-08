const { restClient } = require('../client')

const accountInfo = (coin) => {
  restClient
    .getWalletBalance({ coin: coin })
    .then((data) => {
      if (data['ret_msg'].toString().toUpperCase() === 'OK') {
        console.log('-------', coin, '-------')
        console.log('總資產', data['result'][coin]?.wallet_balance)
        console.log('可用餘額', data['result'][coin]?.available_balance)
        console.log('交易中', data['result'][coin]?.used_margin)
        console.log('總資產(含未實現損益)', data['result'][coin]?.equity)
        console.log('-------', coin, '-------')
      } else {
        console.log('somethings wrong:', data)
      }
    })
    .catch((err) => {
      console.error(err)
    })
}

const getUserLeverage = () => {
  restClient
    .getUserLeverage()
    .then((data) => {
      if (data['ret_msg'].toString().toUpperCase() === 'OK') {
        console.log(data['result'])
      } else {
        console.log('somethings wrong:', data)
      }
    })
    .catch((err) => {
      console.error(err)
    })
}

const changeUserLeverage = (leverage, symbol) => {
  restClient
    .changeUserLeverage({ leverage: leverage, symbol: symbol })
    .then((data) => {
      if (data['ret_msg'].toString().toUpperCase() === 'OK' && data['result'] === leverage) {
        console.log('Done!')
      } else {
        console.log('somethings wrong:', data)
      }
    })
    .catch((err) => {
      console.error(err)
    })
}

module.exports = {
  accountInfo: accountInfo,
  getUserLeverage: getUserLeverage,
  changeUserLeverage: changeUserLeverage,
}
