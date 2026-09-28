# Role-play room

**Live:** https://adhamtarek406-cloud.github.io/roleplay-room/

The ERT role-play room, built from the Claude Design file `Roleplay Room.dc.html`. One trainee takes a practice call with the trainer, and everyone else in the room scores them live on the ERT Experience Recovery scorecard. The trainer reveals the results, then runs the next round. When the session ends, everyone sees a leaderboard.

It's a static site, so there's no backend to run. **The trainer's browser hosts the room.** Trainees connect straight to it over WebRTC. The public [PeerJS](https://peerjs.com) broker only introduces the two browsers to each other. Room data travels browser-to-browser, and PeerJS's relay servers carry it only when a direct connection isn't possible.

## Using it

1. The trainer opens the site, creates a room, and copies the invite link (`…/#/room/ERT-1234`).
2. Trainees open the link, tap their pre-added name or type one, and join.
3. The trainer picks who's on the call. Everyone else gets the scorecard. The trainer reveals each round, then ends the session to show the leaderboard.

**The trainer's tab must stay open.** It *is* the room: closing it takes the room offline, and trainees see "Lost the trainer's room". Everything is saved in that browser. Reopen the console from the home page ("Your rooms") and trainees reconnect on their own, with rounds and scores intact. The browser warns before closing the tab while trainees are connected.

**Scoring settings** (chosen when creating the room):
- **Rating scale:** Met / Not met, or Met / Partial / Not met (Partial counts as half credit).
- **Auto-fail:** *Zero the score* sets the final score to 0 when the room gives any auto-fail attribute less than half credit on average. *Flag only* keeps the score and shows the flag.
- **Running score:** whether scorers see their score so far while they work.

The final score is the weighted average of every submitted scorecard. A scorer's *alignment* is how close their answers were to the room's average.

## Develop

```bash
npm install
npm run dev
npm test
```

`npm run dev` serves on the network too, so phones on the same Wi-Fi can join. `npm test` checks the room logic with simulated trainees; no browser is needed. To rehearse on your own, open `/dev/bots.html?code=ERT-1234&n=4` on the dev server. It adds bot trainees who score each round (dev only, not deployed).

## Deploy

Every push to `main` builds, tests and publishes to GitHub Pages (`.github/workflows/deploy.yml`). In the repository's **Settings → Pages**, the source must be **GitHub Actions**. The build uses relative paths and hash routes, so it works at `https://<user>.github.io/<repo>/` or any other static host.

## Project layout

```
shared/scorecard.js   Categories, attributes, weights and the scoring maths
shared/rooms.js       Room state and every trainer/trainee action, with validation
shared/hub.js         Runs a room: applies actions, answers trainee messages, broadcasts the view
src/lib/host.js       Trainer side: hosts the hub on the room's PeerJS id, saves to localStorage
src/lib/useRoom.js    Trainee side: connects to the host, reconnects, heartbeat
src/ds/               Tamara design system: tokens, fonts, Icon/Badge/Button ported from the DS bundle
src/screens/          Trainer console, trainee view, round report and leaderboard
scripts/test.mjs      Room tests with fake connections
dev/bots.html         Bot trainees for rehearsing (dev server only)
```

## Trust model and limits

- The site is public, and so is the scorecard content in it. Rooms aren't discoverable, but anyone with a room's link can join it while the trainer's tab is open. There are no accounts. It's built for a trusted training cohort.
- Only the host browser can run a room. Trainees can't take trainer actions. They can only join and submit scorecards, and the host validates both.
- Live answers stay in the trainer's browser until the round is revealed.
- The app depends on the free public PeerJS broker (`0.peerjs.com`) to connect browsers. If it's down, new connections can't be made. Very strict corporate firewalls can block WebRTC. PeerJS falls back to its relay (TURN) servers, which usually get through.
- History lives only in the trainer's browser. Clearing site data deletes it, and it can't be moved to another device.
- Fonts follow the design system's substitutions: Outfit stands in for Degular Display, and IBM Plex Sans Arabic for GT America.
