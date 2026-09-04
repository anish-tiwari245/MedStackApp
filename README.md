# MedStack

Mobile app for tracking your medications and catching bad interactions before they happen. Point your camera at a pill bottle, it reads the label, and it flags anything that shouldn't be taken together.

Built with Expo + React Native.

## What it does

- **Scan or add manually** — camera reads a label and pulls the drug name/dosage, or you can just type it in
- **Interaction check** — every time your stack changes, it's checked against the others for conflicts and gives each pair a red/yellow/green rating
- **Groups** — organize meds into groups (mornings, a specific prescriber, whatever) instead of one long list
- **Rename** — if a scan comes back as "ibuprofen" but you know it as Advil, you can rename it in the stack
- **Two map views** — a node graph showing how everything connects, or a plain list with letter grades (A–F) if you'd rather not deal with the graph
- **Accounts** — sign up / sign in, each account keeps its own stack and groups saved on-device

Note: sign-in is local only right now — accounts and passwords are stored on the device with AsyncStorage, there's no real backend auth. Fine for a demo, not for anything real yet.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or run it in a simulator from the terminal menu.

### Backend

The scan and interaction-check calls hit a small API defined in `lib/api.ts`. Right now it points at a hardcoded local IP:

```ts
const BACKEND_URL = 'http://192.168.1.244:8080';
```

Change that to wherever your backend is actually running before scanning/checking will work.

## Project layout

```
app/(tabs)/index.tsx      top-level screen state, tabs, onboarding
components/medstack/      Scan / Stack / Map screens, Auth, Onboarding
components/medstack/maps/ the two map views (node graph, list)
lib/                      api client, AsyncStorage persistence
types/medstack.ts         shared types (Drug, Group, Pair, etc.)
```

This project uses [file-based routing](https://docs.expo.dev/router/introduction) via `expo-router`.

## Disclaimer

This is a prototype. It is not medical advice — always check with a doctor or pharmacist.
