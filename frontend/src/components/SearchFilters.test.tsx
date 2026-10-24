import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchFilters } from './SearchFilters';

describe('SearchFilters', () => {
  it('submits the entered filters', async () => {
    const onSearch = vi.fn();
    render(<SearchFilters categories={['Sedan', 'SUV']} onSearch={onSearch} />);

    await userEvent.type(screen.getByLabelText(/make/i), 'Toyota');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'SUV');
    await userEvent.type(screen.getByLabelText(/min price/i), '20000');
    await userEvent.type(screen.getByLabelText(/max price/i), '35000');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenLastCalledWith({
      make: 'Toyota',
      model: '',
      category: 'SUV',
      minPrice: '20000',
      maxPrice: '35000',
    });
  });

  it('shows an error and does not search when min price exceeds max price', async () => {
    const onSearch = vi.fn();
    render(<SearchFilters categories={[]} onSearch={onSearch} />);

    await userEvent.type(screen.getByLabelText(/min price/i), '50000');
    await userEvent.type(screen.getByLabelText(/max price/i), '1000');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/min price/i);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('clears all fields and searches with no filters on reset', async () => {
    const onSearch = vi.fn();
    render(<SearchFilters categories={[]} onSearch={onSearch} />);

    await userEvent.type(screen.getByLabelText(/model/i), 'Civic');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByLabelText(/model/i)).toHaveValue('');
    expect(onSearch).toHaveBeenLastCalledWith({});
  });
});
