# Pahunch

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

`npm run setup` creates `data/pahunch.sqlite` and seeds six fictional orders if the file is missing. `npm run dev` does that setup and then starts Next.js on port 47231. `npm run reset` deletes and reseeds only that database.

```bash
npm test
```

## What you can do

- Hub queue with a derived next action, approval checklist, route scenario, shadow-mode profiles and an event timeline.
- Customer delivery update: receive today, request a later run, nominate a neighbour, correct an address, or cancel.
- A separate neighbour screen for receive consent and, on the COD lane, payment consent.
- Platform payment simulator that writes a server confirmation. Rider COD due then becomes ₹0.
- Neighbour COD lane: the rider collects the exact due, then records a physical receipt with the demo code.
- Cancellation, stale tasks, offline rejection, route caps, PIN repair and parcel inspection.
- Pilot metrics from persisted orders, the proposed matched-hub design, and the case calculator.

The role switcher is demo navigation, not authentication. The receipt code is a walkthrough aid, not a production OTP.

## Boundaries

Fictional orders and a local state machine. No Meesho, Valmo, SMS, payment gateway, geocoder or rider-app connection. No shopping catalogue, marketplace, chatbot or new fraud model.

SQLite is a file on the machine running the Node server. A static host cannot serve this backend. A Node host with a persistent disk can. The source repository and a deployed app are separate steps, and deployment was not done from this session.

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
