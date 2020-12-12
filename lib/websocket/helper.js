const processPositionMessage = (datas) => {
  for (const data of datas) {
    const { symbol, size, side, entry_price, position_value } = data
    if (
      positionCache[symbol]?.size !== size ||
      positionCache[symbol]?.side !== side ||
      positionCache[symbol]?.entryPrice !== entry_price
    ) {
      positionCache[symbol] = {
        side: side,
        size: size,
        entryPrice: entry_price,
      }
      console.log('position', `${symbol} ${side} Qty: ${size}`)
    }
  }
}

module.exports = {
  processPositionMessage: processPositionMessage,
}
