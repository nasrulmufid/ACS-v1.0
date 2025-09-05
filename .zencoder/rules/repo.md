---
description: Repository Information Overview
alwaysApply: true
---

# ACS Web Interface Information

## Summary
A Next.js web application that provides a management dashboard for CPE (Customer Premises Equipment) devices integrated with GenieACS. The application allows monitoring and management of network devices with features like device status tracking, filtering, sorting, and device operations.

## Structure
- **app/**: Next.js application code using the App Router pattern
  - **api/**: API routes for device data
  - **components/**: Reusable UI components
  - **devices/**: Device-specific pages
  - **login/**: Authentication pages
- **public/**: Static assets and SVG icons
- **.next/**: Build output directory

## Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.x
**Framework**: Next.js 15.5.2
**Build System**: Turbopack
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- next: 15.5.2
- react: 19.1.0
- react-dom: 19.1.0
- @radix-ui/react-checkbox: ^1.3.3
- @radix-ui/react-dialog: ^1.1.1
- @radix-ui/react-icons: ^1.3.2

**Development Dependencies**:
- typescript: ^5
- eslint: ^9
- tailwindcss: ^4
- @types/react: ^19
- @types/node: ^20

## Build & Installation
```bash
# Install dependencies
npm ci

# Development with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## Docker
**Dockerfile**: Dockerfile
**Image**: acs-web:prod
**Configuration**: Multi-stage build with Node.js 20 Alpine
**Compose**: docker-compose.yml with environment variables for GenieACS integration

**Docker Commands**:
```bash
# Build and start container
docker compose up -d --build

# View logs
docker compose logs -f

# Stop containers
docker compose down
```

## Main Entry Points
**Application Entry**: app/page.tsx
**API Routes**: app/api/devices/
**Authentication**: app/login/
**Device Details**: app/devices/[sn]/

## Environment Configuration
The application uses environment variables for configuration:
- GENIEACS_BASE_URL: URL for GenieACS backend
- USER_LOGIN: Admin username
- PASSWORD_LOGIN: Admin password

## Integration Points
The application integrates with GenieACS for CPE device management, fetching device data through API calls and providing a user interface for monitoring and controlling devices.