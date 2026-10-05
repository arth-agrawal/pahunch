import type { Database } from "better-sqlite3";
import { dateKey } from "../domain/time";

export const DEMO_NOW = Date.parse("2026-10-05T04:00:00.000Z");

export type ShipmentSeed = {
  id: string;
  buyerName: string;
  itemName: string;
  sku: string;
  amount: number;
  hubName: string;
  hubContext: string;
  addressLine: string;
  landmark: string;
  locality: string;
  pin: string;
  addressException: string | null;
  parcelException: string | null;
  routeAddedM: number;
  routeAddedMin: number;
  demoCode: string;
  buyerProfileId: string;
  supplierProfileId: string;
};

export const PROFILES = [
  {
    id: "buyer-asha",
    kind: "buyer",
    name: "Saanvi Verma",
    windowLabel: "Jan–Aug 2026 closed orders",
    accepted: 8,
    buyerRefusals: 2,
    excluded: 2,
    delivered: null,
    wrongItems: null,
    inspected: null,
    packingDefects: null,
  },
  {
    id: "buyer-kabir",
    kind: "buyer",
    name: "Kabir Menon",
    windowLabel: "Jan–Aug 2026 closed orders",
    accepted: 6,
    buyerRefusals: 1,
    excluded: 1,
    delivered: null,
    wrongItems: null,
    inspected: null,
    packingDefects: null,
  },
  {
    id: "buyer-meera",
    kind: "buyer",
    name: "Meera Joshi",
    windowLabel: "Jan–Aug 2026 closed orders",
    accepted: 11,
    buyerRefusals: 0,
    excluded: 3,
    delivered: null,
    wrongItems: null,
    inspected: null,
    packingDefects: null,
  },
  {
    id: "buyer-imran",
    kind: "buyer",
    name: "Imran Qureshi",
    windowLabel: "Jan–Aug 2026 closed orders",
    accepted: 4,
    buyerRefusals: 1,
    excluded: 2,
    delivered: null,
    wrongItems: null,
    inspected: null,
    packingDefects: null,
  },
  {
    id: "buyer-pooja",
    kind: "buyer",
    name: "Pooja Nair",
    windowLabel: "No closed orders in the reporting window",
    accepted: 0,
    buyerRefusals: 0,
    excluded: 0,
    delivered: null,
    wrongItems: null,
    inspected: null,
    packingDefects: null,
  },
  {
    id: "buyer-dev",
    kind: "buyer",
    name: "Dev Patel",
    windowLabel: "Jan–Aug 2026 closed orders",
    accepted: 2,
    buyerRefusals: 0,
    excluded: 1,
    delivered: null,
    wrongItems: null,
    inspected: null,
    packingDefects: null,
  },
  {
    id: "supplier-kurta",
    kind: "supplier",
    name: "Northwind Textiles · Cotton kurta",
    windowLabel: "Completed reporting window, separate from the packing sample",
    accepted: null,
    buyerRefusals: null,
    excluded: null,
    delivered: 120,
    wrongItems: 2,
    inspected: 40,
    packingDefects: 1,
  },
  {
    id: "supplier-tiffin",
    kind: "supplier",
    name: "Bhiwandi Steelworks · Steel tiffin",
    windowLabel: "Completed reporting window, separate from the packing sample",
    accepted: null,
    buyerRefusals: null,
    excluded: null,
    delivered: 80,
    wrongItems: 1,
    inspected: 20,
    packingDefects: 1,
  },
] as const;

export const SHIPMENTS: ShipmentSeed[] = [
  {
    id: "PH-2401",
    buyerName: "Saanvi Verma",
    itemName: "Cotton kurta set",
    sku: "KURTA-14",
    amount: 299,
    hubName: "Powai",
    hubContext: "dense_lane",
    addressLine: "Flat 14, Lake View Society, Hiranandani, Powai",
    landmark: "Blue gate beside the D-Mart",
    locality: "Hiranandani Gardens",
    pin: "400076",
    addressException: null,
    parcelException: null,
    routeAddedM: 40,
    routeAddedMin: 1,
    demoCode: "4821",
    buyerProfileId: "buyer-asha",
    supplierProfileId: "supplier-kurta",
  },
  {
    id: "PH-2402",
    buyerName: "Kabir Menon",
    itemName: "Brass study lamp",
    sku: "LAMP-07",
    amount: 449,
    hubName: "Thane",
    hubContext: "mixed_town",
    addressLine: "Flat 7, Vartak Nagar, Thane West",
    landmark: "Yellow building near the post office",
    locality: "Vartak Nagar",
    pin: "400606",
    addressException: null,
    parcelException: null,
    routeAddedM: 60,
    routeAddedMin: 1,
    demoCode: "1933",
    buyerProfileId: "buyer-kabir",
    supplierProfileId: "supplier-kurta",
  },
  {
    id: "PH-2403",
    buyerName: "Meera Joshi",
    itemName: "Printed bedsheet",
    sku: "BED-22",
    amount: 379,
    hubName: "Powai",
    hubContext: "dense_lane",
    addressLine: "Plot 22, Chandivali Farm Road, Powai",
    landmark: "Label says Chandivali; PIN is a Powai code",
    locality: "Chandivali",
    pin: "400076",
    addressException: "pin_conflict",
    parcelException: null,
    routeAddedM: 70,
    routeAddedMin: 2,
    demoCode: "7740",
    buyerProfileId: "buyer-meera",
    supplierProfileId: "supplier-kurta",
  },
  {
    id: "PH-2404",
    buyerName: "Imran Qureshi",
    itemName: "Steel tiffin",
    sku: "TIFFIN-3",
    amount: 599,
    hubName: "Andheri",
    hubContext: "peripheral",
    addressLine: "Room 3, Lokhandwala Complex, Andheri West",
    landmark: "Green door after the tea stall",
    locality: "Lokhandwala",
    pin: "400053",
    addressException: null,
    parcelException: "packing",
    routeAddedM: 90,
    routeAddedMin: 2,
    demoCode: "2208",
    buyerProfileId: "buyer-imran",
    supplierProfileId: "supplier-tiffin",
  },
  {
    id: "PH-2405",
    buyerName: "Pooja Nair",
    itemName: "Cotton socks, pack of 3",
    sku: "SOCK-9",
    amount: 349,
    hubName: "Thane",
    hubContext: "mixed_town",
    addressLine: "Room 9, Ghodbunder Road, Thane West",
    landmark: "Second floor, white railing",
    locality: "Ghodbunder Road",
    pin: "400607",
    addressException: null,
    parcelException: null,
    routeAddedM: 50,
    routeAddedMin: 1,
    demoCode: "5512",
    buyerProfileId: "buyer-pooja",
    supplierProfileId: "supplier-kurta",
  },
  {
    id: "PH-2406",
    buyerName: "Dev Patel",
    itemName: "Notebook set",
    sku: "NOTE-5",
    amount: 199,
    hubName: "Andheri",
    hubContext: "peripheral",
    addressLine: "Lane 5, Versova, Andheri West",
    landmark: "Brown gate opposite the clinic",
    locality: "Versova",
    pin: "400061",
    addressException: null,
    parcelException: null,
    routeAddedM: 80,
    routeAddedMin: 2,
    demoCode: "8086",
    buyerProfileId: "buyer-dev",
    supplierProfileId: "supplier-tiffin",
  },
];

export const NEIGHBOUR_FIXTURE = {
  name: "Riya Sharma",
  address: "Flat 18, Lake View Society, Hiranandani, Powai",
  landmark: "Opposite the D-Mart",
};

export function seedDatabase(db: Database, now = DEMO_NOW): void {
  const today = dateKey(now);
  const insertProfile = db.prepare(`
    INSERT INTO profiles (
      id, kind, name, window_label, accepted, buyer_refusals, excluded,
      delivered, wrong_items, inspected, packing_defects, shadow_mode
    ) VALUES (
      @id, @kind, @name, @windowLabel, @accepted, @buyerRefusals, @excluded,
      @delivered, @wrongItems, @inspected, @packingDefects, 1
    )
  `);
  const insertShipment = db.prepare(`
    INSERT INTO shipments (
      id, buyer_name, item_name, sku, amount, hub_name, hub_context, phase, revision,
      address_line, landmark, locality, pin, address_exception, address_exception_note,
      parcel_exception, parcel_exception_owner, parcel_exception_note, hub_receipt_at,
      promise_date, scheduled_date, requested_date, later_confirmed, later_declined,
      prompt_at, cancelled_at, delivered_at, delivery_mode, route_added_m, route_added_min,
      demo_code, buyer_profile_id, supplier_profile_id, instruction_stale
    ) VALUES (
      @id, @buyerName, @itemName, @sku, @amount, @hubName, @hubContext, 'at_hub', 1,
      @addressLine, @landmark, @locality, @pin, @addressException, NULL,
      @parcelException, NULL, NULL, @hubReceiptAt,
      @promiseDate, NULL, NULL, 0, 0,
      @promptAt, NULL, NULL, NULL, @routeAddedM, @routeAddedMin,
      @demoCode, @buyerProfileId, @supplierProfileId, 0
    )
  `);
  const insertEvent = db.prepare(`
    INSERT INTO events (shipment_id, actor, action, revision, detail, created_at, task_id, invalidated)
    VALUES (?, ?, ?, 1, ?, ?, NULL, 0)
  `);

  const write = db.transaction(() => {
    db.prepare("DELETE FROM events").run();
    db.prepare("DELETE FROM exceptions").run();
    db.prepare("DELETE FROM receipts").run();
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM payments").run();
    db.prepare("DELETE FROM nominations").run();
    db.prepare("DELETE FROM readiness_responses").run();
    db.prepare("DELETE FROM shipments").run();
    db.prepare("DELETE FROM profiles").run();
    db.prepare("DELETE FROM settings").run();

    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("demo_now", String(now));
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("cap_meters", "100");
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("cap_minutes", "2");
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("rider_offline", "0");

    for (const profile of PROFILES) insertProfile.run(profile);

    for (const shipment of SHIPMENTS) {
      const hubReceiptAt = now - 2 * 60 * 60 * 1000;
      const promptAt = now - 30 * 60 * 1000;
      insertShipment.run({
        ...shipment,
        hubReceiptAt,
        promptAt,
        promiseDate: today,
      });
      insertEvent.run(
        shipment.id,
        "hub",
        "hub_receipt",
        "Parcel scanned at the local hub.",
        hubReceiptAt,
      );
      insertEvent.run(
        shipment.id,
        "system",
        "prompt_delivered",
        "Delivery update opened in the demo. No live SMS was sent.",
        promptAt,
      );
      if (shipment.addressException) {
        insertEvent.run(
          shipment.id,
          "hub",
          "exception_opened",
          "PIN and locality do not describe the same place. Held for destination review.",
          promptAt + 1000,
        );
      }
      if (shipment.parcelException) {
        insertEvent.run(
          shipment.id,
          "hub",
          "exception_opened",
          "Outer pack is torn. Held for parcel inspection before dispatch.",
          promptAt + 1000,
        );
      }
    }
  });

  write();
}

export function reseedShipment(db: Database, shipmentId: string, now: number): void {
  const shipment = SHIPMENTS.find((item) => item.id === shipmentId);
  if (!shipment) throw new Error(`Unknown shipment ${shipmentId}`);
  const today = dateKey(now);
  const hubReceiptAt = now - 2 * 60 * 60 * 1000;
  const promptAt = now - 30 * 60 * 1000;

  const write = db.transaction(() => {
    for (const table of [
      "events",
      "exceptions",
      "receipts",
      "tasks",
      "payments",
      "nominations",
      "readiness_responses",
    ]) {
      db.prepare(`DELETE FROM ${table} WHERE shipment_id = ?`).run(shipmentId);
    }
    db.prepare("DELETE FROM shipments WHERE id = ?").run(shipmentId);
    db.prepare(`
      INSERT INTO shipments (
        id, buyer_name, item_name, sku, amount, hub_name, hub_context, phase, revision,
        address_line, landmark, locality, pin, address_exception, address_exception_note,
        parcel_exception, parcel_exception_owner, parcel_exception_note, hub_receipt_at,
        promise_date, scheduled_date, requested_date, later_confirmed, later_declined,
        prompt_at, cancelled_at, delivered_at, delivery_mode, route_added_m, route_added_min,
        demo_code, buyer_profile_id, supplier_profile_id, instruction_stale
      ) VALUES (
        @id, @buyerName, @itemName, @sku, @amount, @hubName, @hubContext, 'at_hub', 1,
        @addressLine, @landmark, @locality, @pin, @addressException, NULL,
        @parcelException, NULL, NULL, @hubReceiptAt,
        @promiseDate, NULL, NULL, 0, 0,
        @promptAt, NULL, NULL, NULL, @routeAddedM, @routeAddedMin,
        @demoCode, @buyerProfileId, @supplierProfileId, 0
      )
    `).run({ ...shipment, hubReceiptAt, promptAt, promiseDate: today });
    db.prepare(`
      INSERT INTO events (shipment_id, actor, action, revision, detail, created_at, task_id, invalidated)
      VALUES (?, 'hub', 'hub_receipt', 1, 'Parcel scanned at the local hub.', ?, NULL, 0)
    `).run(shipmentId, hubReceiptAt);
    db.prepare(`
      INSERT INTO events (shipment_id, actor, action, revision, detail, created_at, task_id, invalidated)
      VALUES (?, 'system', 'prompt_delivered', 1, 'Delivery update opened in the demo. No live SMS was sent.', ?, NULL, 0)
    `).run(shipmentId, promptAt);
  });
  write();
}
