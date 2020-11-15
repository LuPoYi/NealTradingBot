const { restClient } = require('../client')

function getLatestInformation(symbol) {
  console.log('getLatestInformation')
  let last_price = 0
  return new Promise(function (resolve, reject) {
    restClient
      .getLatestInformation({ symbol: symbol })
      .then((data) => {
        console.log('Data', data)
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          // TODO: error handling
          last_price = data['result'].find((item) => item.symbol === symbol)?.last_price
          resolve(last_price)
        }
        throw data
      })
      .catch((err) => {
        reject(err)
      })
  })
}

module.exports = {
  getLatestInformation: getLatestInformation,
}
