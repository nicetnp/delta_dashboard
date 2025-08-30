# Delta Dashboard Frontend

Frontend application for Delta Dashboard built with React + Vite + TypeScript + Tailwind CSS.

## Features

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Responsive design** for all devices

## Pages

- **Calibration Management** - Main calibration form and records
- **Failure Management** - Failure tracking and analysis
- **Fixture Detail** - Individual fixture information
- **Station Detail** - Station-specific details
- **Tester Detail** - Tester information

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open browser at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── CalibrationForm.tsx
│   ├── FailureIndex.tsx
│   ├── FixtureDetail.tsx
│   ├── Navigation.tsx
│   ├── StationDetail.tsx
│   └── TesterDetail.tsx
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles with Tailwind
```

## API Integration

The frontend connects to the backend API at `http://127.0.0.1:8000` for:
- Calibration CRUD operations
- Failure data
- Fixture information
- Station details
- Tester data

## Styling

- **Tailwind CSS** for utility-first styling
- **Responsive design** with mobile-first approach
- **Modern UI components** with consistent design system

## Development

- **Hot reload** with Vite
- **TypeScript** for type safety
- **ESLint** for code quality
- **React Strict Mode** enabled
