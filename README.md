# الحسابات - Accounting & Order Management PWA

Offline-first Progressive Web App for micro and small businesses in Jordan. Built with React + Vite + Tailwind CSS + Dexie.js (IndexedDB). Works 100% offline after first load.

## Features

- **100% Offline**: All data stored locally via IndexedDB. No backend required.
- **Arabic RTL UI**: Native right-to-left Arabic interface with Cairo / IBM Plex Sans Arabic fonts.
- **Samsung One UI Design**: Light mode, large touch targets, bottom sheets, soft shadows.
- **Cash Accounting**: Track income (قبض), expenses (صرف), and personal withdrawals separately.
- **Order Tracking**: List view + monthly calendar view with status dots.
- **Backup & Restore**: JSON export via native Share Sheet, restore from file picker.
- **WhatsApp Integration**: Share order details via WhatsApp with customizable template.
- **PWA Installable**: Add to home screen, works like a native app.
- **Local Notifications**: Reminders for upcoming orders.
- **Haptic Feedback**: Vibration on key actions for native feel.
- **Pagination**: 20 records per page to prevent memory leaks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 (custom One UI theme) |
| Database | Dexie.js 4 (IndexedDB wrapper) |
| PWA | vite-plugin-pwa + Workbox 7 |
| Routing | react-router-dom 6 |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment (Cloudflare Pages)

1. Run `npm run build` to produce `dist/`.
2. Deploy the `dist/` folder to Cloudflare Pages.
3. No environment variables required.

## Project Structure

```
src/
├── components/    # Reusable UI components
├── db/           # Dexie.js database schema & queries
├── hooks/        # Custom React hooks
├── pages/        # Route-level page components
├── utils/        # Helpers (format, date, haptics, notifications)
├── styles/       # Tailwind CSS entry
├── App.jsx       # Root component with routing
└── main.jsx      # Entry point
```

## License

Proprietary - Built for Jordanian micro businesses.
