const { RestClient } = require("@pxtrn/bybit-api");

const API_KEY = "LwvRUniwGSPY95DfVB";
const PRIVATE_KEY = "OCqpAESo1Uut8adt1OKyykZ06Rzq5s3aWWWy";

const client = new RestClient(API_KEY, PRIVATE_KEY);

client
  .changeUserLeverage({ leverage: 10, symbol: "ETHUSD" })
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.error(error);
  });
