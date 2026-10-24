import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from './Navbar';
import { admin, buyer, loginAs, renderWithProviders } from '../test/utils';
import { TOKEN_KEY } from '../api/client';

describe('Navbar', () => {
  it('renders nothing when logged out', () => {
    const { container } = renderWithProviders(<Navbar />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the signed-in user and their initials', () => {
    loginAs(buyer);
    renderWithProviders(<Navbar />);

    expect(screen.getByText('Jane Buyer')).toBeInTheDocument();
    expect(screen.getByText('JB')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('badges admins', () => {
    loginAs(admin);
    renderWithProviders(<Navbar />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('clears the session on log out', async () => {
    loginAs(buyer);
    renderWithProviders(<Navbar />);

    await userEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(screen.queryByText('Jane Buyer')).not.toBeInTheDocument();
  });
});
