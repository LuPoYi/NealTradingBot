### Bybit 合約網格

### 如何使用

```zsh
# 安裝 redis
> sudo apt update
> sudo apt install redis-server

# 啟動 redis
> sudo systemctl status redis-server

# 下載專案
> git clone https://github.com/LuPoYi/NealTradingBot
> cd NealTradingBot
> yarn

# 更改設定檔
> cp .env.backup .env
> vim .env

## 執行
> tmux
> node main.js

```

#### Package

- inquirer
- readline
- chalk

#### Flow

- 程式開啟

  - 確認 redis
  - 確認 API KEY / API SECRET
  - 確認是否能取得 bybit API

- 互動介面
  1. Account 倉位及餘額
  2. GridTrading 網格單
  3. WebSocket 開啟(會持續追踨已設定價位並下單)

```zsh
API_KEY cRjXldmNYI0mi2s246
[Check] Redis OK
BTC
  最新成交價 19263.00
  可用餘額 0.10458617
  BTCUSD Sell 倉位: Qty: 414 Value: 0.10496202
ETH
  最新成交價 594.25
  可用餘額 3.38753387
  ETHUSD None 倉位: Qty: 0 Value: 0
目前尚無網格單
? 是否要繼續? Yes
? 要幹麻?
  1) Account 倉位及餘額
  2) GridTrading 網格單
  3) WebSocket 開啟(會持續追踨已設定價位並下單)
```

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
  - 下單 `13000 long` `13500 long` - `0.2 BTC` (close, reduce only)
  - 下單 `14500 shrot` `15000 short` - `0.2 BTC` (open)
  - `14000 skip` (最接近`13888`)

- 持續追蹤訂單狀態

  - 若現價往上 `14100`：
    - Skip
  - 若現價往上 `14600`
    - `14500 short`成交，倉位變化為 `-6`
    - 當前訂單為 ` 13000 long``13500 long ` `15000 shrot`
    - 下單 `14000 long`
  - 若現價往下 `13488`：
    - `13500 long`成交，倉位變化為 `-4`
    - 當前訂單為 `13000 long` `14500 shrot` `15000 shrot`
    - 下單 `14000 short`

  > 規則：買單成交，就在上一個價位開賣單(open)；賣單成交，就在下一個價位開買單(close)

### 特殊情況

- 現價超出上限
  - 倉位為 `-8`
  - 訂單為 `13000 long` `13500 long` `14000 long` `14500 long`
- 現價低於上限
  - 倉位為 `0`
  - 訂單為 `13500 short` `14000 short` `14500 short` `15000 short`

### Redis schema

- previewGridTrading
- gridTrading
- historyGridTrading

## TODO

- 大量下單超出 Bybit 上限 - Too many visits!
- 計算獲利
- 可即時呈現下單狀況(telegram bot?)
- Error Handling
- Log to file
