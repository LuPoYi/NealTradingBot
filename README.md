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
