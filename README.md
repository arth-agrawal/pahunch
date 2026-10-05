# Pahunch

<p align="center">
  <a href="https://chamber-assumed-producers-swing.trycloudflare.com">
    <img src="https://img.shields.io/badge/%E2%96%B6%20%20CLICK%20HERE%20TO%20OPEN%20THE%20LIVE%20MVP-f43397?style=for-the-badge&labelColor=f43397&color=f43397" alt="Click here to open the live MVP" height="48">
  </a>
</p>

<p align="center">
  <b>👉 <a href="https://chamber-assumed-producers-swing.trycloudflare.com">https://chamber-assumed-producers-swing.trycloudflare.com</a> 👈</b><br>
  <sub>Live interactive prototype. No login. Follow the yellow <b>Tap here</b> bubble. Works on phone and laptop.</sub>
</p>

<!-- When you deploy, replace the URL in the two links above with your permanent one (Render / Railway / Vercel). -->

<p align="center">
  <a href="https://render.com/deploy"><img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" height="32"></a>
  &nbsp;
  <a href="https://railway.com/new"><img src="https://railway.com/button.svg" alt="Deploy on Railway" height="32"></a>
  &nbsp;
  <a href="https://vercel.com/new"><img src="https://vercel.com/button" alt="Deploy with Vercel" height="32"></a>
</p>

> **Team Pahunch · IIT Bombay · Arth Agrawal & Nandini Goyal** · Meesho DICE Challenge 3.0

Pahunch is a working prototype for the Meesho DICE Challenge 3.0, Round 2. When a cash-on-delivery parcel is at the local hub, it asks whether the buyer is ready, can connect that buyer to a named neighbour who agrees independently, and gives the hub and rider one current, payment-safe instruction.

It is a proposal for Valmo by Arth Agrawal and Nandini Goyal, IIT Bombay. It is not an official Meesho product.

The submitted presentation was not in this workspace. Economics and pilot design follow the implementation brief, which carries the case arithmetic.

## Run it

Requirements: Node.js 22 and npm.

```bash
npm install
npm run setup
npm run dev
```

Open [http://127.0.0.1:47231](http://127.0.0.1:47231).

`npm run setup` creates `data/pahunch.sqlite` and seeds the fictional orders (Saanvi in Powai, Kabir in Thane, Meera in Powai, plus three hub-only rows) if the file is missing. `npm run dev` does that setup and then starts Next.js on port 47231. `npm run reset` deletes and reseeds only that database.

```bash
npm test
```

## Deploy it

The repo ships ready-made configs for three hosts. Pick one, connect this GitHub repo, and the defaults do the rest.

| Host | Config in repo | Demo state | Notes |
| --- | --- | --- | --- |
| **Render** (recommended) | `render.yaml` | Persistent (1 GB disk) | New → Blueprint → pick the repo. Disk needs the Starter plan. |
| **Railway** | `railway.json` | Persistent if you add a Volume | Add a volume mounted at `/data` and set `PAHUNCH_DB=/data/pahunch.sqlite`. |
| **Vercel** | `vercel.json` | Resets on cold start | Zero config, free. The SQLite file lives in `/tmp`, so the demo reseeds itself after idle periods. Fine for judges clicking through in one sitting; not for data you want to keep. |

Manual (any Node 22 host):

```bash
npm install
npm run build
npm run setup
npm start        # honours $PORT, defaults to 47231
```

Set `PAHUNCH_DB=/path/on/persistent/disk/pahunch.sqlite` if the host mounts storage somewhere specific. Everyone who opens the deployed link shares one database; the **Restart from the beginning** button on the right panel resets it.

After deploying, paste the new URL into the two **Open the live MVP** links at the top of this file.

## Calculations

Default case, held in `lib/domain/economics.ts` and covered by tests:

```text
COD RTO       = 80,000 × 20% = 16,000
Prepaid RTO   = 20,000 × 5%  = 1,000
Total RTO     = 17,000 / 1,00,000 = 17.0%
Target RTO    = 17.0% − 1.2 percentage points = 15.8%
Additional final RTOs prevented = 1,200
Gross avoided reverse cost = 1,200 × ₹120 = ₹1,44,000
Programme budget = ₹1,00,000
Modelled net = ₹44,000
Break-even = ceil(₹1,00,000 / ₹120) = 834
```

Reference nets at a ₹1,00,000 budget and ₹120 reverse cost: 600 gives −₹28,000, 834 gives ₹80, 1,200 gives ₹44,000. The ₹50 forward node cost, including ₹21 LMDC, is not added on top of the ₹120 reverse cost.

## Demo

The short path is in the in-app guide and in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md). The main order is PH-2401. Riya’s demo receipt code is 4821. Dev’s code, for the cancellation case, is 8086.

## Tests

`npm test` runs Vitest against the domain calculator, the SQLite service (including direct stale-task rejection) and the HTTP action route. The browser walkthrough is a separate check of the rendered hub, customer, neighbour and rider screens.

## Layout

- `lib/domain` — typed rules, metrics and the calculator
- `lib/server/service.ts` — transactions and audit events
- `lib/db` — SQLite schema and fictional seed
- `app/api` — state, actions and audit export
- `components` — hub, customer, neighbour, rider and pilot views
