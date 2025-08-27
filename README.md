# Lava Pub Restaurant POS System

A modern Point of Sale (POS) system built with React.js, Vite, and Bootstrap for the Lava Pub Restaurant.

## Features

- **Table Management**: View and manage restaurant tables with different statuses (Blank, Booked, Running, etc.)
- **Menu Management**: Browse and search through menu items by categories
- **Order Management**: Add items to orders, manage quantities, and calculate totals
- **Real-time Calculations**: Automatic calculation of subtotal, taxes, and service charges
- **Responsive Design**: Works on desktop and tablet devices
- **Modern UI**: Clean and intuitive interface using Bootstrap
- **Fast Development**: Built with Vite for lightning-fast development experience

## Technology Stack

- **React.js**: Frontend framework
- **Vite**: Build tool and development server
- **Bootstrap 5**: UI framework for responsive design
- **React Router**: Client-side routing
- **React Icons**: Icon library

## Installation

1. Clone the repository or download the files
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx      # Main dashboard component
│   ├── Header.jsx         # Header with mode tabs
│   ├── Sidebar.jsx        # Left sidebar with categories
│   ├── TablesGrid.jsx     # Tables display grid
│   ├── MenuGrid.jsx       # Menu items display grid
│   └── OrderSidebar.jsx   # Right sidebar for orders
├── App.jsx               # Main app component with routing
├── main.jsx              # App entry point
├── index.css             # Global styles
└── App.css               # App-specific styles
```

## Usage

### Table Management
- View tables organized by categories (Gold, DG, Platinum, etc.)
- Click on a table to start an order
- Tables show different colors based on status:
  - Gray: Blank/Available
  - Blue: Booked
  - Green: Running (with order)
  - Red: Running KOT
  - Dark Gray: Printed

### Menu Management
- Browse menu items by categories
- Search for specific items using the search bar
- Click the "+" button to add items to the current order

### Order Management
- View selected table information
- Add/remove items and adjust quantities
- Automatic calculation of:
  - Subtotal
  - Service Charge (configurable percentage)
  - CGST (2.5%)
  - SGST (2.5%)
  - Round off
  - Total amount

### Actions
- **SAVE KOT**: Save Kitchen Order Ticket
- **PRINT KOT**: Print Kitchen Order Ticket
- **SAVE BILL**: Save the final bill
- **PRINT BILL**: Print the final bill

## Customization

### Adding New Menu Items
Edit the `menuItems` array in `Dashboard.jsx`:

```javascript
const menuItems = [
  { id: 1, name: 'Item Name', price: 100, category: 'Category' },
  // Add more items...
];
```

### Adding New Table Categories
Edit the `tableCategories` array in `Dashboard.jsx`:

```javascript
const tableCategories = ['All', 'Gold', 'DG', 'Platinum', 'New Category'];
```

### Modifying Tax Rates
Edit the tax calculation functions in `OrderSidebar.jsx`:

```javascript
const calculateCGST = () => {
  return (calculateSubtotal() * 2.5) / 100; // Change 2.5 to desired rate
};
```

## Build for Production

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `dist` folder.

To preview the production build:

```bash
npm run preview
```

## Why Vite?

- **Lightning Fast**: Instant server start and hot module replacement
- **Rich Features**: Built-in TypeScript, JSX, CSS and more
- **Optimized Build**: Uses Rollup for production builds
- **Universal Plugin API**: Compatible with Rollup plugins
- **Framework Agnostic**: Works with React, Vue, Svelte, and more

## License

This project is for educational and commercial use. 