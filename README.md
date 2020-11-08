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

#### Package

- inquirer
- readline

#### Flow

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

網格基本規則：

// high 0.9
// low 0.7
// grids 10
// => 0.7888, 0.7666, 0.7

// high 14000
// low 13000
// grids 10

### 空單網格

- 先設定網格價位列表 `13000, 13500, 14000, 14500, 15000`
- 比現價還大的單就直接下空單(open)
- 若現價往下碰到設定好的網格價位時，在該網格價補一個空單(open) - 限價 post only
- 若現價往上碰到設定好的網格價位且空單成交時，在下一個網格價補一張多單(close)

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
