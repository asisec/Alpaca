const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const fs = require("fs");
const sqlite3 = require("sqlite3");
const crypto = require("crypto");

function resolveSqlitePath() {
  const sqlitePath = process.env.SQLITE_PATH;
  if (!sqlitePath) throw new Error("SQLITE_PATH tanımlı değil");
  return path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(path.join(__dirname, ".."), sqlitePath);
}

function openDb(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

let dbPromise = null;
async function getDb() {
  if (dbPromise) return dbPromise;

  const resolvedPath = resolveSqlitePath();
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    throw new Error(`Dizin bulunamadı: ${dir}`);
  }

  dbPromise = (async () => {
    const db = await openDb(resolvedPath);
    await run(
      db,
      `create table if not exists users (
        id integer primary key,
        email text not null unique,
        display_name text not null,
        password_salt text not null,
        password_hash text not null,
        role text not null default 'individual',
        is_approved integer not null default 1,
        created_at text not null default (datetime('now'))
      )`
    );
    // Mevcut tablolar için yeni alanları ekle (migration)
    try {
      await run(db, "alter table users add column role text not null default 'individual'");
    } catch (e) {}
    try {
      await run(db, "alter table users add column is_approved integer not null default 1");
    } catch (e) {}

    // Events tablosu oluştur
    await run(
      db,
      `create table if not exists events (
        id integer primary key,
        organizer_id integer not null,
        name text not null,
        venue text not null,
        event_date text not null,
        capacity integer not null,
        standard_price real not null default 0,
        vip_price real not null default 0,
        created_at text not null default (datetime('now')),
        foreign key (organizer_id) references users(id)
      )`
    );
    // Migration için events tablosuna fiyat alanları ekle
    try { await run(db, "alter table events add column standard_price real not null default 0"); } catch (e) {}
    try { await run(db, "alter table events add column vip_price real not null default 0"); } catch (e) {}
    try { await run(db, "alter table events add column description text not null default ''"); } catch (e) {}
    try { await run(db, "alter table events add column image_url text not null default ''"); } catch (e) {}
    try { await run(db, "alter table events add column discount_threshold integer not null default 0"); } catch (e) {}
    try { await run(db, "alter table events add column discount_percent real not null default 0"); } catch (e) {}

    // Subscriptions tablosu (kullanıcılar etkinliklere abone olabilir)
    await run(
      db,
      `create table if not exists subscriptions (
        id integer primary key,
        user_id integer not null,
        event_id integer not null,
        created_at text not null default (datetime('now')),
        unique(user_id, event_id),
        foreign key (user_id) references users(id),
        foreign key (event_id) references events(id)
      )`
    );

    // Orders tablosu oluştur
    await run(
      db,
      `create table if not exists orders (
        id integer primary key,
        event_id integer not null,
        buyer_id integer not null,
        customer_name text not null,
        ticket_type text not null,
        quantity integer not null,
        total_price real not null,
        status text not null default 'paid',
        seat_numbers text not null default '',
        created_at text not null default (datetime('now')),
        foreign key (event_id) references events(id),
        foreign key (buyer_id) references users(id)
      )`
    );
    try { await run(db, "alter table orders add column seat_numbers text not null default ''"); } catch (e) {}

    return db;
  })();

  return dbPromise;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, saltHex) {
  const salt = Buffer.from(saltHex, "hex");
  const hash = crypto.scryptSync(String(password), salt, 64);
  return hash.toString("hex");
}

function validateAuthInput({ email, password, displayName }, { requireDisplayName }) {
  const e = normalizeEmail(email);
  const p = String(password || "");
  const d = String(displayName || "").trim();

  if (!e || !e.includes("@")) return { ok: false, error: "Geçerli bir e‑posta gir." };
  if (p.length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };
  if (requireDisplayName && d.length < 2) return { ok: false, error: "İsim en az 2 karakter olmalı." };
  return { ok: true, email: e, password: p, displayName: d };
}

let currentUser = null;

ipcMain.handle("auth:me", async () => {
  if (!currentUser) return { ok: true, user: null };
  return { ok: true, user: currentUser };
});

ipcMain.handle("auth:logout", async () => {
  currentUser = null;
  return { ok: true };
});

ipcMain.handle("auth:register", async (_evt, payload) => {
  const v = validateAuthInput(payload || {}, { requireDisplayName: true });
  if (!v.ok) return v;

  const role = payload.role || "individual";
  const isApproved = role === "individual" ? 1 : 0;

  try {
    const db = await getDb();
    const saltHex = crypto.randomBytes(16).toString("hex");
    const hashHex = hashPassword(v.password, saltHex);

    await run(
      db,
      "insert into users (email, display_name, password_salt, password_hash, role, is_approved) values (?, ?, ?, ?, ?, ?)",
      [v.email, v.displayName, saltHex, hashHex, role, isApproved]
    );

    const user = await get(db, "select id, email, display_name as displayName, role, is_approved as isApproved, created_at as createdAt from users where email = ?", [
      v.email
    ]);
    
    if (role === "individual") {
      currentUser = user;
      return { ok: true, user };
    } else {
      return { ok: true, user: null, requiresApproval: true, message: "Organizasyon hesabınız admin onayına gönderildi." };
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.toLowerCase().includes("unique")) {
      return { ok: false, error: "Bu e‑posta zaten kayıtlı." };
    }
    return { ok: false, error: msg };
  }
});

ipcMain.handle("auth:login", async (_evt, payload) => {
  const v = validateAuthInput(payload || {}, { requireDisplayName: false });
  if (!v.ok) return v;

  try {
    const db = await getDb();
    const row = await get(
      db,
      "select id, email, display_name as displayName, password_salt as salt, password_hash as hash, role, is_approved as isApproved, is_admin as isAdmin, created_at as createdAt from users where email = ?",
      [v.email]
    );
    if (!row) return { ok: false, error: "E‑posta veya şifre hatalı." };

    const computed = hashPassword(v.password, row.salt);
    if (computed !== row.hash) return { ok: false, error: "E‑posta veya şifre hatalı." };

    if (row.role === "organization" && row.isApproved !== 1) {
      return { ok: false, error: "Organizasyon hesabınız henüz onaylanmadı." };
    }

    const user = { id: row.id, email: row.email, displayName: row.displayName, role: row.role, isApproved: row.isApproved, isAdmin: row.isAdmin || 0, createdAt: row.createdAt };
    currentUser = user;
    return { ok: true, user };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("db:check", async () => {
  let resolvedPath;
  try {
    resolvedPath = resolveSqlitePath();
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }

  try {
    // Dosya yolu geçerli mi? (yoksa sqlite otomatik yaratır; yine de dizin var mı kontrol edelim)
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      return { ok: false, error: "Dizin bulunamadı", details: [dir] };
    }

    const db = await getDb();

    await run(
      db,
      "create table if not exists app_meta (id integer primary key, created_at text not null default (datetime('now')))"
    );
    await run(db, "insert into app_meta default values");
    const row = await get(
      db,
      "select datetime('now') as now, (select count(*) from app_meta) as meta_rows"
    );

    return { ok: true, sqlitePath: resolvedPath, ...row };
  } catch (e) {
    return {
      ok: false,
      error: e && e.message ? e.message : String(e),
      hint: "SQLITE_PATH yolunu (.env) kontrol et. Örn: SQLITE_PATH=./app.sqlite"
    };
  }
});

// Admin: Bekleyen organizasyonları listele
ipcMain.handle("admin:pending-orgs", async () => {
  try {
    const db = await getDb();
    const rows = await all(
      db,
      "select id, email, display_name as displayName, created_at as createdAt from users where role = 'organization' and is_approved = 0"
    );
    return { ok: true, users: rows };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Admin: Organizasyonu onayla
ipcMain.handle("admin:approve-org", async (_evt, userId) => {
  try {
    const db = await getDb();
    await run(db, "update users set is_approved = 1 where id = ?", [userId]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Etkinlik oluştur (organizasyonlar veya admin)
ipcMain.handle("events:create", async (_evt, payload) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  const isAdmin = currentUser.isAdmin === 1;
  if (currentUser.role !== "organization" && !isAdmin) {
    return { ok: false, error: "Sadece organizasyonlar veya admin etkinlik oluşturabilir." };
  }

  const { name, venue, eventDate, capacity, standardPrice, vipPrice, description, imageUrl,
          discountThreshold, discountPercent } = payload || {};
  if (!name || !venue || !eventDate || !capacity) {
    return { ok: false, error: "Ad, mekan, tarih ve kontenjan zorunlu." };
  }
  const stdPrice = Number(standardPrice) || 0;
  const vPrice = Number(vipPrice) || 0;
  const dThreshold = parseInt(discountThreshold) || 0;
  const dPercent = Number(discountPercent) || 0;
  if (stdPrice < 0 || vPrice < 0) return { ok: false, error: "Fiyatlar negatif olamaz." };
  if (dPercent < 0 || dPercent > 100) return { ok: false, error: "İndirim oranı 0-100 arasında olmalı." };
  if (dThreshold < 0) return { ok: false, error: "İndirim eşiği negatif olamaz." };

  try {
    const db = await getDb();
    const result = await run(
      db,
      `insert into events
        (organizer_id, name, venue, event_date, capacity, standard_price, vip_price,
         description, image_url, discount_threshold, discount_percent)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [currentUser.id, name, venue, eventDate, capacity, stdPrice, vPrice,
       description || "", imageUrl || "", dThreshold, dPercent]
    );
    return { ok: true, eventId: result.lastID };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Etkinlik güncelle (sadece sahibi veya admin)
ipcMain.handle("events:update", async (_evt, payload) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };

  const { id, name, venue, eventDate, capacity, standardPrice, vipPrice, description, imageUrl,
          discountThreshold, discountPercent } = payload || {};
  if (!id || !name || !venue || !eventDate || !capacity) {
    return { ok: false, error: "Tüm alanlar zorunlu." };
  }

  try {
    const db = await getDb();
    const event = await get(db, "select organizer_id from events where id = ?", [id]);
    if (!event) return { ok: false, error: "Etkinlik bulunamadı." };
    if (event.organizer_id !== currentUser.id && currentUser.isAdmin !== 1) {
      return { ok: false, error: "Bu etkinliği düzenleme yetkiniz yok." };
    }

    await run(
      db,
      `update events set name = ?, venue = ?, event_date = ?, capacity = ?,
        standard_price = ?, vip_price = ?, description = ?, image_url = ?,
        discount_threshold = ?, discount_percent = ?
       where id = ?`,
      [name, venue, eventDate, capacity, Number(standardPrice) || 0, Number(vipPrice) || 0,
       description || "", imageUrl || "",
       parseInt(discountThreshold) || 0, Number(discountPercent) || 0, id]
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Etkinlik sil (sadece sahibi veya admin)
ipcMain.handle("events:delete", async (_evt, eventId) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  if (!eventId) return { ok: false, error: "Etkinlik ID gerekli." };

  try {
    const db = await getDb();
    const event = await get(db, "select organizer_id from events where id = ?", [eventId]);
    if (!event) return { ok: false, error: "Etkinlik bulunamadı." };
    if (event.organizer_id !== currentUser.id && currentUser.isAdmin !== 1) {
      return { ok: false, error: "Bu etkinliği silme yetkiniz yok." };
    }

    // Satılmış bilet varsa silmeyi engelle
    const sold = await get(db, "select count(*) as cnt from orders where event_id = ? and status = 'paid'", [eventId]);
    if (sold.cnt > 0) {
      return { ok: false, error: "Satılmış biletleri olan etkinlik silinemez." };
    }

    await run(db, "delete from subscriptions where event_id = ?", [eventId]);
    await run(db, "delete from events where id = ?", [eventId]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Etkinliğe abone ol
ipcMain.handle("events:subscribe", async (_evt, eventId) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  if (!eventId) return { ok: false, error: "Etkinlik ID gerekli." };

  try {
    const db = await getDb();
    await run(
      db,
      "insert or ignore into subscriptions (user_id, event_id) values (?, ?)",
      [currentUser.id, eventId]
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Etkinlik aboneliğini iptal et
ipcMain.handle("events:unsubscribe", async (_evt, eventId) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  if (!eventId) return { ok: false, error: "Etkinlik ID gerekli." };

  try {
    const db = await getDb();
    await run(
      db,
      "delete from subscriptions where user_id = ? and event_id = ?",
      [currentUser.id, eventId]
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Etkinlikleri listele (role bazlı filtreleme)
// - individual: tüm etkinlikler (göz atma + bilet alma)
// - organization (non-admin): sadece kendi etkinlikleri
// - admin: tüm etkinlikler
ipcMain.handle("events:list", async () => {
  try {
    const db = await getDb();
    const userId = currentUser ? currentUser.id : 0;
    const isAdmin = currentUser?.isAdmin === 1;
    const role = currentUser?.role;

    let whereClause = "";
    let params = [userId];
    if (role === "organization" && !isAdmin) {
      whereClause = "where e.organizer_id = ?";
      params.push(currentUser.id);
    }

    const rows = await all(
      db,
      `select e.id, e.name, e.venue, e.event_date as eventDate, e.capacity,
              e.standard_price as standardPrice, e.vip_price as vipPrice,
              e.description, e.image_url as imageUrl,
              e.discount_threshold as discountThreshold,
              e.discount_percent as discountPercent,
              e.organizer_id as organizerId,
              e.created_at as createdAt,
              u.display_name as organizerName,
              coalesce((select sum(o.quantity) from orders o where o.event_id = e.id and o.status = 'paid'), 0) as soldTickets,
              coalesce((select sum(o.total_price) from orders o where o.event_id = e.id and o.status = 'paid'), 0) as totalRevenue,
              (select count(*) from subscriptions s where s.event_id = e.id) as subscriberCount,
              (select count(*) from subscriptions s where s.event_id = e.id and s.user_id = ?) as isSubscribed
       from events e
       left join users u on e.organizer_id = u.id
       ${whereClause}
       order by e.event_date asc`,
      params
    );
    return { ok: true, events: rows };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// === ADMIN: Kullanıcı Yönetimi ===
function requireAdmin() {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  if (currentUser.isAdmin !== 1) return { ok: false, error: "Bu işlem için admin yetkisi gerekli." };
  return null;
}

// Admin: Tüm kullanıcıları listele
ipcMain.handle("admin:users-list", async () => {
  const err = requireAdmin();
  if (err) return err;
  try {
    const db = await getDb();
    const rows = await all(db,
      `select id, email, display_name as displayName, role,
              is_approved as isApproved, is_admin as isAdmin,
              created_at as createdAt
       from users order by created_at desc`
    );
    return { ok: true, users: rows };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Admin: Kullanıcı sil
ipcMain.handle("admin:delete-user", async (_evt, userId) => {
  const err = requireAdmin();
  if (err) return err;
  if (!userId) return { ok: false, error: "Kullanıcı ID gerekli." };
  if (userId === currentUser.id) return { ok: false, error: "Kendinizi silemezsiniz." };
  try {
    const db = await getDb();
    // Bu kullanıcıya ait satılmış bilet varsa engelle
    const sold = await get(db,
      `select count(*) as cnt from orders o
       join events e on o.event_id = e.id
       where (e.organizer_id = ? or o.buyer_id = ?) and o.status = 'paid'`,
      [userId, userId]
    );
    if (sold.cnt > 0) {
      return { ok: false, error: "Bu kullanıcıyla ilişkili sipariş kayıtları var, silinemez." };
    }
    await run(db, "delete from subscriptions where user_id = ?", [userId]);
    await run(db, "delete from events where organizer_id = ?", [userId]);
    await run(db, "delete from users where id = ?", [userId]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Admin: Kullanıcı rolünü güncelle (role / isAdmin / isApproved)
ipcMain.handle("admin:update-user", async (_evt, payload) => {
  const err = requireAdmin();
  if (err) return err;
  const { userId, role, isAdmin, isApproved } = payload || {};
  if (!userId) return { ok: false, error: "Kullanıcı ID gerekli." };

  try {
    const db = await getDb();
    const updates = [];
    const params = [];
    if (role !== undefined) {
      if (!["individual", "organization"].includes(role)) {
        return { ok: false, error: "Geçersiz rol." };
      }
      updates.push("role = ?");
      params.push(role);
    }
    if (isAdmin !== undefined) {
      updates.push("is_admin = ?");
      params.push(isAdmin ? 1 : 0);
    }
    if (isApproved !== undefined) {
      updates.push("is_approved = ?");
      params.push(isApproved ? 1 : 0);
    }
    if (updates.length === 0) return { ok: false, error: "Güncellenecek alan yok." };
    params.push(userId);
    await run(db, `update users set ${updates.join(", ")} where id = ?`, params);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Yardımcı: bir etkinliğin satılmış (rezerve) koltuk numaralarını set olarak getir
async function getBookedSeats(db, eventId) {
  const rows = await all(db,
    "select seat_numbers from orders where event_id = ? and status = 'paid'",
    [eventId]
  );
  const set = new Set();
  for (const r of rows) {
    if (!r.seat_numbers) continue;
    for (const s of String(r.seat_numbers).split(",")) {
      const n = parseInt(s);
      if (!Number.isNaN(n) && n > 0) set.add(n);
    }
  }
  return set;
}

// Etkinliğin koltuk haritası (boş/dolu)
ipcMain.handle("events:seats", async (_evt, eventId) => {
  if (!eventId) return { ok: false, error: "Etkinlik ID gerekli." };
  try {
    const db = await getDb();
    const event = await get(db, "select id, capacity from events where id = ?", [eventId]);
    if (!event) return { ok: false, error: "Etkinlik bulunamadı." };
    const booked = await getBookedSeats(db, eventId);
    return { ok: true, capacity: event.capacity, bookedSeats: Array.from(booked).sort((a,b)=>a-b) };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Sipariş oluştur
ipcMain.handle("orders:create", async (_evt, payload) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };

  const { eventId, customerName, ticketType, quantity, seats } = payload || {};
  if (!eventId || !customerName || !ticketType) {
    return { ok: false, error: "Tüm alanlar zorunlu." };
  }
  if (!["standard", "vip"].includes(ticketType)) {
    return { ok: false, error: "Geçersiz bilet türü." };
  }

  // Manuel koltuk seçimi varsa quantity'yi seçilen koltuk sayısı olarak al
  const requestedSeats = Array.isArray(seats)
    ? seats.map(s => parseInt(s)).filter(n => !Number.isNaN(n) && n > 0)
    : [];
  const qty = requestedSeats.length > 0 ? requestedSeats.length : parseInt(quantity);
  if (!qty || qty < 1) return { ok: false, error: "Geçerli bilet adedi girin." };

  try {
    const db = await getDb();
    const event = await get(db, "select * from events where id = ?", [eventId]);
    if (!event) return { ok: false, error: "Etkinlik bulunamadı." };

    const booked = await getBookedSeats(db, eventId);
    const remaining = event.capacity - booked.size;
    if (qty > remaining) {
      return { ok: false, error: `Yetersiz kontenjan. Kalan: ${remaining}` };
    }

    let assignedSeats = [];
    if (requestedSeats.length > 0) {
      // Manuel seçim: kontrol et
      for (const n of requestedSeats) {
        if (n < 1 || n > event.capacity) {
          return { ok: false, error: `Geçersiz koltuk numarası: ${n}` };
        }
        if (booked.has(n)) {
          return { ok: false, error: `${n} numaralı koltuk dolu.` };
        }
      }
      assignedSeats = [...new Set(requestedSeats)].sort((a,b)=>a-b);
    } else {
      // Otomatik atama: 1..capacity arasından boş olan ilk N koltuk
      for (let n = 1; n <= event.capacity && assignedSeats.length < qty; n++) {
        if (!booked.has(n)) assignedSeats.push(n);
      }
    }

    const unitPrice = ticketType === "vip" ? event.vip_price : event.standard_price;
    let subtotal = unitPrice * qty;
    let discountApplied = 0;

    if (event.discount_threshold > 0 && qty >= event.discount_threshold && event.discount_percent > 0) {
      discountApplied = subtotal * (event.discount_percent / 100);
    }
    const totalPrice = subtotal - discountApplied;

    const result = await run(
      db,
      "insert into orders (event_id, buyer_id, customer_name, ticket_type, quantity, total_price, seat_numbers) values (?, ?, ?, ?, ?, ?, ?)",
      [eventId, currentUser.id, customerName, ticketType, qty, totalPrice, assignedSeats.join(",")]
    );
    return { ok: true, orderId: result.lastID, totalPrice, subtotal, discountApplied, seats: assignedSeats };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Siparişleri listele
ipcMain.handle("orders:list", async () => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };

  try {
    const db = await getDb();
    // Organizasyon sadece kendi etkinliklerine ait siparişleri görür
    // Diğer kullanıcılar kendi aldıkları siparişleri görür (admin hepsini görür)
    let query;
    let params = [];
    
    if (currentUser.isAdmin === 1) {
      query = `select o.id, o.customer_name as customerName, o.ticket_type as ticketType,
                      o.quantity, o.total_price as totalPrice, o.status, o.created_at as createdAt,
                      o.seat_numbers as seatNumbers,
                      e.name as eventName
               from orders o
               join events e on o.event_id = e.id
               order by o.created_at desc
               limit 100`;
    } else if (currentUser.role === "organization") {
      query = `select o.id, o.customer_name as customerName, o.ticket_type as ticketType,
                      o.quantity, o.total_price as totalPrice, o.status, o.created_at as createdAt,
                      o.seat_numbers as seatNumbers,
                      e.name as eventName
               from orders o
               join events e on o.event_id = e.id
               where e.organizer_id = ?
               order by o.created_at desc
               limit 100`;
      params = [currentUser.id];
    } else {
      query = `select o.id, o.customer_name as customerName, o.ticket_type as ticketType,
                      o.quantity, o.total_price as totalPrice, o.status, o.created_at as createdAt,
                      o.seat_numbers as seatNumbers,
                      e.name as eventName
               from orders o
               join events e on o.event_id = e.id
               where o.buyer_id = ?
               order by o.created_at desc
               limit 100`;
      params = [currentUser.id];
    }

    const rows = await all(db, query, params);
    return { ok: true, orders: rows };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

// Dashboard özetleri (role bazlı)
ipcMain.handle("stats:summary", async () => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  try {
    const db = await getDb();
    const role = currentUser.role;
    const isAdmin = currentUser.isAdmin === 1;

    // Bireysel kullanıcı: kendi satın aldığı biletler (harcama)
    if (role === "individual" && !isAdmin) {
      const own = await get(db,
        `select coalesce(sum(total_price), 0) as totalSpent,
                coalesce(sum(quantity), 0) as ticketsBought,
                count(*) as orderCount
         from orders where buyer_id = ? and status = 'paid'`,
        [currentUser.id]
      );
      const subs = await get(db,
        "select count(*) as cnt from subscriptions where user_id = ?",
        [currentUser.id]
      );
      return {
        ok: true,
        scope: "individual",
        totalSpent: own.totalSpent || 0,
        ticketsBought: own.ticketsBought || 0,
        orderCount: own.orderCount || 0,
        subscriptionCount: subs.cnt || 0
      };
    }

    // Organizasyon: kendi etkinlikleri
    // Admin: tüm sistem
    let filterClause = "";
    let params = [];
    if (role === "organization" && !isAdmin) {
      filterClause = "where e.organizer_id = ?";
      params = [currentUser.id];
    }

    const totals = await get(db,
      `select coalesce(sum(o.total_price), 0) as revenue,
              coalesce(sum(o.quantity), 0) as ticketsSold
       from orders o
       join events e on o.event_id = e.id
       ${filterClause} ${filterClause ? "and" : "where"} o.status = 'paid'`,
      params
    );

    const capacity = await get(db,
      `select coalesce(sum(e.capacity), 0) as totalCapacity
       from events e ${filterClause}`,
      params
    );

    const pending = await get(db,
      `select count(*) as cnt from orders o
       join events e on o.event_id = e.id
       ${filterClause} ${filterClause ? "and" : "where"} o.status = 'pending'`,
      params
    );

    return {
      ok: true,
      scope: isAdmin ? "admin" : "organization",
      revenue: totals.revenue || 0,
      ticketsSold: totals.ticketsSold || 0,
      totalCapacity: capacity.totalCapacity || 0,
      pending: pending.cnt || 0
    };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    backgroundColor: "#0f0f10",
    title: "Alpaca",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0f0f10",
      symbolColor: "#f5f5f5",
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.maximize();
  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
