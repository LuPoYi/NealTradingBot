const gridTradingInquirerPrompt = [
  {
    type: 'rawlist',
    name: 'symbol',
    message: '請選擇交易對',
    choices: ['BTCUSD'],
    default: 0,
  },
  {
    type: 'rawlist',
    name: 'side',
    choices: ['Sell'],
    default: 1,
  },
  {
    type: 'input',
    name: 'high',
    message: '網格區間上限',
    default: 20000,
  },
  {
    type: 'input',
    name: 'low',
    message: '網格區間下限',
    default: 18000,
  },
  {
    type: 'input',
    name: 'grids',
    message: '網格數量',
    default: 6,
  },
  {
    type: 'input',
    name: 'totalQty',
    message: '總投資額度',
    default: 300,
  },
]

module.exports = {
  gridTradingInquirerPrompt: gridTradingInquirerPrompt,
}


{
  settings:{
  priceList:[
  20000
  19600
  19200
  18800
  18400
  18000
  ]
  side:"Sell"
  symbol:"BTCUSD"
  high:20000
  low:18000
  grids:6
  totalQty:300
  qty:50
  startAt:1606034107
  }
  currentPosition:{}
  currentOrders:[]
  filledOrders:[]
  orderCount:0
  allOrderResults:[
  {}
  {
  ret_code:0
  ret_msg:"OK"
  ext_code:""
  ext_info:""
  result:{}
  time_now:"1606034109.466631"
  rate_limit_status:98
  rate_limit_reset_ms:1606034109464
  rate_limit:100
  }
  {
  ret_code:0
  ret_msg:"OK"
  ext_code:""
  ext_info:""
  result:{}
  time_now:"1606034109.707079"
  rate_limit_status:97
  rate_limit_reset_ms:1606034109704
  rate_limit:100
  }
  {
  ret_code:0
  ret_msg:"OK"
  ext_code:""
  ext_info:""
  result:{}
  time_now:"1606034109.818726"
  rate_limit_status:96
  rate_limit_reset_ms:1606034109816
  rate_limit:100
  }
  {
  ret_code:0
  ret_msg:"OK"
  ext_code:""
  ext_info:""
  result:{}
  time_now:"1606034109.920299"
  rate_limit_status:95
  rate_limit_reset_ms:1606034109918
  rate_limit:100
  }
  {
  ret_code:0
  ret_msg:"OK"
  ext_code:""
  ext_info:""
  result:{}
  time_now:"1606034110.024067"
  rate_limit_status:94
  rate_limit_reset_ms:1606034110021
  rate_limit:100
  }
  ]
  }