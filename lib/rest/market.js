const { restClient } = require('../client')

async function getLatestInformation(symbol) {
  console.log('restClient', restClient)
  let last_price = 0
  return new Promise(function (resolve, reject) {
    restClient
      .getLatestInformation({ symbol: symbol })
      .then((data) => {
        if (data['ret_msg'].toString().toUpperCase() === 'OK') {
          last_price = data['result'].find((item) => item.symbol === symbol)?.last_price
          console.log('last_price', last_price)
          resolve(last_price)
        } else {
          console.log('somethings wrong:', data)
        }
      })
      .catch((err) => {
        reject(error)
      })
  })
}

module.exports = {
  getLatestInformation: getLatestInformation,
}
