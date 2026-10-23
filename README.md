# Dev Clicker: Junior → CEO

Offline-first incremental game built with **Expo**, **React Native**, and **TypeScript**.

The player grows from student to CEO through hard skills, soft skills, career promotions, cognitive power, influence, and burnout management.

## Prerequisites

- Node.js 18 or later
- npm
- Expo Go on a phone or an Android/iOS simulator

## Install and run

```bash
npm install
npm run start
```

Then choose a platform in Expo's terminal UI, or scan the QR code with Expo Go.

## Quality commands

```bash
npm run ts:check
npm test
```

## Architecture

The source code follows Feature-Sliced Design:

```text
src/
  app/       # application bootstrap and providers
  pages/     # screen composition
  widgets/   # large UI compositions
  features/  # user actions / use cases
  entities/  # game-domain entities and rules
  shared/    # reusable, domain-agnostic infrastructure
```

Feature-specific UI, hooks, model logic, and tests stay within their owning slice. Detailed conventions and product decisions are in [`.agents/rules/project.md`](.agents/rules/project.md).
