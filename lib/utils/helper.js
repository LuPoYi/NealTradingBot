// 整理網格價位設定
const buildGridTradingSettings = ({ side, symbol, high, low, grids, totalQty }) => {
  let priceList = []
  const qty = totalQty / grids
  const step = parseFloat((high - low) / (grids - 1)).toFixed(2)
  const startAt = Math.floor(Date.now() / 1000)

  for (let i = 0; i < grids; i++) {
    priceList.push(parseFloat(high - step * i).toFixed(2))
  }
  return {
    priceList,
    step,
    side,
    symbol,
    high,
    low,
    grids,
    totalQty,
    qty,
    startAt,
  }
}
module.exports = {
  buildGridTradingSettings: buildGridTradingSettings,
}
