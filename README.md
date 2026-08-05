# Nata Baby Mobile

![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-FF5F92)
![Status](https://img.shields.io/badge/status-in%20development-FFC76B)

Mobile app React Native + Expo untuk Nata Baby, aplikasi pemantauan tumbuh kembang anak.

## Stack

- React Native
- Expo
- TypeScript

## Setup

1. Install dependency:

   ```bash
   npm install
   ```

2. Jalankan backend API dari repo backend:

   ```bash
   cd "/Users/bagusamudra/Documents/Child App"
   npm run dev
   ```

3. Jalankan Expo dari repo mobile:

   ```bash
   cd "/Users/bagusamudra/Documents/Child App Mobile"
   npm run start
   ```

API default ada di `http://localhost:3000` melalui `app.json`.
Jika dijalankan di perangkat fisik, ganti `extra.apiUrl` ke IP lokal komputer, misalnya `http://192.168.1.10:3000`.

## Scripts

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run typecheck`
