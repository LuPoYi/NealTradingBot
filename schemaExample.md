### gridTrading

> Redis HGET "gridTrading" "MyUUID"

```js
{
  "settings": {
    "priceList": ["592.88", "592.38", "591.88", "591.38", "590.88"],
    "step": "0.50",
    "side": "Sell",
    "symbol": "ETHUSD",
    "high": "592.88",
    "low": "590.88",
    "grids": "5",
    "totalQty": "420",
    "qty": 20,
    "startAt": 1607174859
  },
  "position": 260,
  "currentOrders": {
    "592.88": {
      "user_id": 131263,
      "order_id": "a7728bf6-b6f5-4eaa-8b64-a3303ec8cb1f",
      "symbol": "ETHUSD",
      "side": "Sell",
      "order_type": "Limit",
      "price": 592.85,
      "qty": 20,
      "time_in_force": "GoodTillCancel",
      "order_status": "Created",
      "last_exec_time": 0,
      "last_exec_price": 0,
      "leaves_qty": 20,
      "cum_exec_qty": 0,
      "cum_exec_value": 0,
      "cum_exec_fee": 0,
      "reject_reason": "EC_NoError",
      "order_link_id": "",
      "created_at": "2020-12-05T13:27:55.827Z",
      "updated_at": "2020-12-05T13:27:55.827Z"
    },
    "592.38": {}
  },
  "allOrderResults": [
    {
      "user_id": 131263,
      "order_id": "02493b17-2d86-46e5-ade2-cd15fac0a93f",
      "symbol": "ETHUSD",
      "side": "Sell",
      "order_type": "Market",
      "price": 530.45,
      "qty": 260,
      "time_in_force": "ImmediateOrCancel",
      "order_status": "Created",
      "last_exec_time": 0,
      "last_exec_price": 0,
      "leaves_qty": 260,
      "cum_exec_qty": 0,
      "cum_exec_value": 0,
      "cum_exec_fee": 0,
      "reject_reason": "EC_NoError",
      "order_link_id": "",
      "created_at": "2020-12-05T13:27:55.706Z",
      "updated_at": "2020-12-05T13:27:55.706Z"
    },
    {}
  ],
  "currentOrderBuyIDs": ["f5966508-d98a-4125-8c7d-bb5e29bd82d4", "..."],
  "currentOrderSellIDs": ["a7728bf6-b6f5-4eaa-8b64-a3303ec8cb1f", "..."],
  "filledOrderBuyIDs": [],
  "filledOrderSellIDs": ["02493b17-2d86-46e5-ade2-cd15fac0a93f"]
}
```
