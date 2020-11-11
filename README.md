### Bybit 合約網格

#### Basic

- API KEY/SECRET 僅放在 local
- 設定好網格基本參數後就直接下多張單
- 批次網格單
- 可即時呈現下單狀況(telegram?)
- 有任何下單或交易都要通知(telegram?)
- Error handling 要做好

#### MEMO

- 使用 Websocket 取即時資料

  - 倉位更新 position
  - 下單更新 execution

- 使用 Rest API 下單及刪單

- 計算金額獲利…

- use Redis as DB

- 需支援多網格

#### Package

- inquirer
- readline

#### Flow

1. 建網格單 (set redis)
2. 確認是否要執行，(執行時需要下市價單)

```zsh
# Create Grid trading
 node order.js     ✔  4661  21:29:09
? 請選擇交易對 ETH/USDT - USDT
? 網格區間上限 10000
? 網格區間下限 8000
? 網格數量 20
? 總投資額度 1
{
  "pair": "ETH/USDT - USDT",
  "high": "10000",
  "low": "8000",
  "grids": "20",
  "totalAmount": "1"
}
```



### 空單網格

> 若現價在設定的上下限內，當前訂單只會有`設定的總網格數-1`筆

- 網格設定 `High: 15000, Low: 13000, Grids: 5, TotalQty: 1 BTC`

- 網格資料
  - 價位列表 `13000, 13500, 14000, 14500, 15000`
  - 每筆網格為 `0.2 BTC`
  - 目前現價 `13888`
  
- 下單執行

  - 執行市價空單 `0.4 BTC` (倉位 `-4 BTC`)
  -  下單 `13000 long` `13500 long` -  `0.2 BTC` (close, reduce only)
  -  下單 `14500 shrot` `15000 short` - `0.2 BTC` (open)
  - `14000 skip` (最接近`13888`)

- 持續追蹤訂單狀態

  - 若現價往上 `14100`：
    - Skip
  - 若現價往上 `14600`
    - `14500 short`成交，倉位變化為 `-6` 
    - 當前訂單為 `13000 long``13500 long`  `15000 shrot`
    - 下單 `14000 long`
  - 若現價往下 `13488`：
    - `13500 long`成交，倉位變化為 `-4` 
    - 當前訂單為 `13000 long`  `14500 shrot` `15000 shrot`
    - 下單 `14000 short`

  > 規則：買單成交，就在上一個價位開賣單(open)；賣單成交，就在下一個價位開買單(close)



### 特殊情況

* 現價超出上限
  * 倉位為 `-8` 
  * 訂單為 `13000 long`  `13500 long` `14000 long` `14500 long`
* 現價低於上限
  * 倉位為 `0`
  * 訂單為 `13500 short` `14000 short` `14500 short` `15000 short`

<!--
active_gridTrading -> UUID(123456789) -> {
 startAt = Time.now,
 count = 1,
 side = "Buy",
 symbol = "BTCUSD",
 high = 14000,
 low = 13000,
 grids = 10,
 totalQty = 3000,
 baseOrderPrices = [13000, 13100, 13200, ...],
 currentOrderID: ["123", "456", "789"],
 filledOrderID: ["321", "654"]

} -->

<!--
// 設定網格進redis
redisClient.set('gridTrading', {

  settings: {
    priceList: [16000, 15800, 15600, 15400, 15200, 15000, 14800, 14600, 14400, 14200, 14000],
    side: 'Sell - Short',
    symbol: 'BTCUSD',
    high: 16000,
    low: 14000,
    grids: 11,
    totalQty: 1000,
    qty: 90.9090909090909,
    startAt: 1604826504,
  }

  pairOrderIDs: {
    openID: closeID || null,
    openID2: closeID2 || null,
  },

  currentPosition: {
  },
  currentOrders: [{

  }],
  filledOrders: [{

  }]
}) -->

<!--
> gridTradingExecute('yu0f9', 1604930338)
gridTradingSettings {
  settings: {
    priceList: [
      16000, 15800, 15600,
      15400, 15200, 15000,
      14800, 14600, 14400,
      14200, 14000
    ],
    side: 'Sell',
    symbol: 'BTCUSD',
    high: 16000,
    low: 14000,
    grids: 11,
    totalQty: 1000,
    qty: 90.9090909090909,
    startAt: 1604930338
  }
} -->

網格基本規則：

// high 0.9
// low 0.7
// grids 10
// => 0.7888, 0.7666, 0.7

// high 14000
// low 13000
// grids 10