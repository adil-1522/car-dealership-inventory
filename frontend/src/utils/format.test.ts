import { formatPrice, stockLabel } from './format';

describe('formatPrice', () => {
  it('formats whole dollars without cents', () => {
    expect(formatPrice(27500)).toBe('$27,500');
  });

  it('rounds fractional amounts', () => {
    expect(formatPrice(999.6)).toBe('$1,000');
  });
});

describe('stockLabel', () => {
  it.each([
    [0, 'Sold out'],
    [1, 'Only 1 left'],
    [3, 'Only 3 left'],
    [4, '4 in stock'],
  ])('describes quantity %i as "%s"', (quantity, label) => {
    expect(stockLabel(quantity)).toBe(label);
  });
});
