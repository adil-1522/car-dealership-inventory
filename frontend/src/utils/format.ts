const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

/** Human-friendly stock level; low stock (≤3) is called out to create urgency. */
export function stockLabel(quantity: number): string {
  if (quantity === 0) return 'Sold out';
  if (quantity <= 3) return `Only ${quantity} left`;
  return `${quantity} in stock`;
}
