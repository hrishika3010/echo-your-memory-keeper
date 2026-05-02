# Echo Hackathon

## What Echo Is

Echo is for the moments that are too good to disappear into a messy group chat.

You go out with friends. You travel together. You celebrate a birthday, a wedding, a random Tuesday dinner that somehow becomes the night everyone talks about for months. People take photos. People send them around. And then, like always, everything gets buried.

Echo changes that.

You send your photos and memories to Echo, and Echo turns them into a live public album that everyone can open, share, and come back to. No digging through chat history. No asking who has the good pictures. No losing the feeling of the night because the memories got scattered across ten phones.

The product is not just storage. It is a living memory thread.

Echo can also talk back from the memories. You can ask things like:

- when was the last time we all went out together
- send me the photos from Priya's birthday
- what was that rooftop place from Friday
- show me the best moments from the trip

So the core idea is:

- first, Echo becomes the place where the group sends everything
- then, Echo turns that stream into a live public album
- then, Echo helps people revisit the memory in a human way

## The MVP

The main MVP is simple:

1. A group sends photos to Echo.
2. Echo collects them in one place.
3. Echo creates a live public album that can be shared instantly.
4. Later, people can ask Echo about the memory and get something that feels personal, not robotic.

This matters because the real product is emotional. People do not want a file manager for their lives. They want a place where a night, a trip, or a relationship still feels alive after it is over.

## What Is In This Repo

- `src/` - the React frontend for the Echo landing page
- `public/` - demo images used by the landing page
- `backend/` - backend MVP scaffold for albums, assets, memories, and provider integrations
- `docs/` - project notes, including the backend MVP checklist

## Frontend

The frontend is the current product story.

It shows:

- what Echo is
- how someone uses it
- the emotional feel of the product
- example memory conversations
- the call to action

Tech stack:

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

The backend is meant to support the MVP flow behind the scenes:

- receive incoming photo memories
- attach them to an album
- process and publish the memory
- make the album publicly accessible
- support memory-based replies later

Important: the backend is still an early scaffold. The package scripts reference files like `src/api/server.ts` and `src/worker/index.ts`, but those entry files are not in the repo yet.

## How To Run The Frontend

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Useful Frontend Commands

```bash
npm run build
npm run test
npm run lint
```

## Backend Setup

```bash
cd backend
npm install
```

Useful backend commands:

```bash
npm run test
npm run typecheck
```

The `dev` and `dev:worker` scripts are planned, but they will not run successfully until the missing backend entry files are added.

## Current Status

- Frontend landing page is present
- Product story and MVP direction are clear
- Backend domain scaffold is present
- Backend runnable API and worker are not finished yet
