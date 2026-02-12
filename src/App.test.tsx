import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders app shell without crashing', () => {
  render(<App />);
  expect(document.body).toBeInTheDocument();
});
