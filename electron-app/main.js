const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const crypto = require("crypto");

const { Schema, model, Types } = mongoose;

const UserSchema = new Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName:  { type: String, required: true },
  passwordSalt: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, default: "individual", enum: ["individual", "organization"] },
  isApproved:   { type: Number, default: 1 },
  isAdmin:      { type: Number, default: 0 },
  bio:          { type: String, default: "" },
  website:      { type: String, default: "" },
  createdAt:    { type: Date, default: Date.now }
});

const EventSchema = new Schema({
  organizerId:       { type: Schema.Types.ObjectId, ref: "User", required: true },
  name:              { type: String, required: true },
  venue:             { type: String, required: true },
  eventDate:         { type: Date, required: true },
  capacity:          { type: Number, required: true },
  standardPrice:     { type: Number, default: 0 },
  vipPrice:          { type: Number, default: 0 },
  description:       { type: String, default: "" },
  imageUrl:          { type: String, default: "" },
  discountThreshold: { type: Number, default: 0 },
  discountPercent:   { type: Number, default: 0 },
  createdAt:         { type: Date, default: Date.now }
});

const OrderSchema = new Schema({
  eventId:      { type: Schema.Types.ObjectId, ref: "Event", required: true },
  buyerId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
  customerName: { type: String, required: true },
  ticketType:   { type: String, required: true, enum: ["standard", "vip"] },
  quantity:     { type: Number, required: true },
  totalPrice:   { type: Number, required: true },
  status:       { type: String, default: "paid" },
  seatNumbers:  [{ type: Number }],
  createdAt:    { type: Date, default: Date.now }
});

const SubscriptionSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  eventId:   { type: Schema.Types.ObjectId, ref: "Event", required: true },
  createdAt: { type: Date, default: Date.now }
});
SubscriptionSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const PasswordResetRequestSchema = new Schema({
  email:             { type: String, required: true, lowercase: true, trim: true },
  userId:            { type: Schema.Types.ObjectId, ref: "User", default: null },
  lastKnownPassword: { type: String, default: "" },
  reportedAmount:    { type: Number, default: 0 },
  accuracyScore:     { type: Number, default: 0 },
  status:            { type: String, default: "pending", enum: ["pending", "approved", "rejected", "completed"] },
  adminNote:         { type: String, default: "" },
  createdAt:         { type: Date, default: Date.now },
  resolvedAt:        { type: Date, default: null }
});

const User                 = model("User", UserSchema);
const Event                = model("Event", EventSchema);
const Order                = model("Order", OrderSchema);
const Subscription         = model("Subscription", SubscriptionSchema);
const PasswordResetRequest = model("PasswordResetRequest", PasswordResetRequestSchema);

let dbReady = false;
async function connectDb() {
  if (dbReady) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI tanımlı değil (.env dosyasını kontrol edin)");
  await mongoose.connect(uri);
  dbReady = true;
}

function toId(id) {
  return new Types.ObjectId(id);
}

function serializeUser(u) {
  if (!u) return null;
  return {
    id:          u._id.toString(),
    email:       u.email,
    displayName: u.displayName,
    role:        u.role,
    isApproved:  u.isApproved,
    isAdmin:     u.isAdmin || 0,
    bio:         u.bio || "",
    website:     u.website || "",
    createdAt:   u.createdAt
  };
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
  const { _id, ...safe } = currentUser;
  return { ok: true, user: safe };
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
    await connectDb();
    const saltHex = crypto.randomBytes(16).toString("hex");
    const hashHex = hashPassword(v.password, saltHex);

    const user = await User.create({
      email: v.email,
      displayName: v.displayName,
      passwordSalt: saltHex,
      passwordHash: hashHex,
      role,
      isApproved
    });

    if (role === "individual") {
      const serialized = serializeUser(user);
      currentUser = { ...serialized, _id: user._id };
      return { ok: true, user: serialized };
    } else {
      return { ok: true, user: null, requiresApproval: true, message: "Organizasyon hesabınız admin onayına gönderildi." };
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (msg.includes("E11000") || msg.toLowerCase().includes("duplicate key")) {
      return { ok: false, error: "Bu e-posta zaten kayıtlı." };
    }
    return { ok: false, error: msg };
  }
});

ipcMain.handle("auth:login", async (_evt, payload) => {
  const v = validateAuthInput(payload || {}, { requireDisplayName: false });
  if (!v.ok) return v;

  try {
    await connectDb();
    const user = await User.findOne({ email: v.email });
    if (!user) return { ok: false, error: "E-posta veya şifre hatalı." };

    const computed = hashPassword(v.password, user.passwordSalt);
    if (computed !== user.passwordHash) return { ok: false, error: "E-posta veya şifre hatalı." };

    if (user.role === "organization" && user.isApproved !== 1) {
      return { ok: false, error: "Organizasyon hesabınız henüz onaylanmadı." };
    }

    const serialized = serializeUser(user);
    currentUser = { ...serialized, _id: user._id };
    return { ok: true, user: serialized };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("db:check", async () => {
  try {
    await connectDb();
    const userCount = await User.countDocuments();
    return { ok: true, mongoUri: process.env.MONGODB_URI, userCount };
  } catch (e) {
    return {
      ok: false,
      error: e && e.message ? e.message : String(e),
      hint: "MONGODB_URI değerini (.env) kontrol et. Örn: mongodb://alpaca:alpaca123@localhost:27017/alpaca?authSource=admin"
    };
  }
});

ipcMain.handle("profile:update", async (_evt, payload) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  const { displayName, bio, website, currentPassword, newPassword } = payload || {};
  try {
    await connectDb();
    const user = await User.findById(currentUser._id);
    if (!user) return { ok: false, error: "Kullanıcı bulunamadı." };

    const update = {};

    if (displayName !== undefined) {
      const d = String(displayName).trim();
      if (d.length < 2) return { ok: false, error: "İsim en az 2 karakter olmalı." };
      update.displayName = d;
    }

    if (bio !== undefined)     update.bio     = String(bio).trim();
    if (website !== undefined) update.website = String(website).trim();

    if (newPassword !== undefined && newPassword !== "") {
      if (!currentPassword) return { ok: false, error: "Mevcut şifrenizi girin." };
      const computed = hashPassword(String(currentPassword), user.passwordSalt);
      if (computed !== user.passwordHash) return { ok: false, error: "Mevcut şifre yanlış." };
      if (String(newPassword).length < 8) return { ok: false, error: "Yeni şifre en az 8 karakter olmalı." };
      const newSalt = crypto.randomBytes(16).toString("hex");
      update.passwordSalt = newSalt;
      update.passwordHash = hashPassword(String(newPassword), newSalt);
    }

    if (Object.keys(update).length === 0) return { ok: false, error: "Değiştirilecek alan yok." };

    await User.updateOne({ _id: currentUser._id }, update);
    const updated = await User.findById(currentUser._id);
    const serialized = serializeUser(updated);
    currentUser = { ...serialized, _id: currentUser._id };
    return { ok: true, user: serialized };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

function requireAdmin() {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  if (currentUser.isAdmin !== 1) return { ok: false, error: "Bu işlem için admin yetkisi gerekli." };
  return null;
}

ipcMain.handle("admin:pending-orgs", async () => {
  try {
    await connectDb();
    const users = await User.find({ role: "organization", isApproved: 0 }, "email displayName createdAt");
    return { ok: true, users: users.map(u => ({ id: u._id.toString(), email: u.email, displayName: u.displayName, createdAt: u.createdAt })) };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("admin:approve-org", async (_evt, userId) => {
  try {
    await connectDb();
    await User.updateOne({ _id: toId(userId) }, { isApproved: 1 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("admin:users-list", async () => {
  const err = requireAdmin();
  if (err) return err;
  try {
    await connectDb();
    const users = await User.find({}).sort({ createdAt: -1 });
    return { ok: true, users: users.map(serializeUser) };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("admin:delete-user", async (_evt, userId) => {
  const err = requireAdmin();
  if (err) return err;
  if (!userId) return { ok: false, error: "Kullanıcı ID gerekli." };
  if (userId === currentUser.id) return { ok: false, error: "Kendinizi silemezsiniz." };
  try {
    await connectDb();
    const oid = toId(userId);
    const orgEvents = await Event.find({ organizerId: oid }, "_id");
    const eventIds = orgEvents.map(e => e._id);
    const soldCount = await Order.countDocuments({
      $or: [
        { eventId: { $in: eventIds }, status: "paid" },
        { buyerId: oid, status: "paid" }
      ]
    });
    if (soldCount > 0) return { ok: false, error: "Bu kullanıcıyla ilişkili sipariş kayıtları var, silinemez." };
    await Subscription.deleteMany({ userId: oid });
    await Event.deleteMany({ organizerId: oid });
    await User.deleteOne({ _id: oid });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("admin:update-user", async (_evt, payload) => {
  const err = requireAdmin();
  if (err) return err;
  const { userId, role, isAdmin, isApproved } = payload || {};
  if (!userId) return { ok: false, error: "Kullanıcı ID gerekli." };
  try {
    await connectDb();
    const update = {};
    if (role !== undefined) {
      if (!["individual", "organization"].includes(role)) return { ok: false, error: "Geçersiz rol." };
      update.role = role;
    }
    if (isAdmin !== undefined) update.isAdmin = isAdmin ? 1 : 0;
    if (isApproved !== undefined) update.isApproved = isApproved ? 1 : 0;
    if (Object.keys(update).length === 0) return { ok: false, error: "Güncellenecek alan yok." };
    await User.updateOne({ _id: toId(userId) }, update);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("admin:reset-password", async (_evt, payload) => {
  const err = requireAdmin();
  if (err) return err;
  const { userId, newPassword } = payload || {};
  if (!userId) return { ok: false, error: "Kullanıcı ID gerekli." };
  if (!newPassword || String(newPassword).length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };
  try {
    await connectDb();
    const user = await User.findById(toId(userId));
    if (!user) return { ok: false, error: "Kullanıcı bulunamadı." };
    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = hashPassword(String(newPassword), newSalt);
    await User.updateOne({ _id: toId(userId) }, { passwordSalt: newSalt, passwordHash: newHash });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("pwreset:check", async (_evt, email) => {
  if (!email) return { ok: false, error: "E-posta gerekli." };
  try {
    await connectDb();
    const req = await PasswordResetRequest.findOne({ email: normalizeEmail(email) }).sort({ createdAt: -1 });
    if (!req || req.status === "completed") return { ok: true, status: "none" };
    if (req.status === "rejected" && req.adminNote && req.adminNote.includes("\u015eifre s\u0131f\u0131rland\u0131")) return { ok: true, status: "none" };
    return { ok: true, status: req.status, adminNote: req.adminNote, requestId: req._id.toString() };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("pwreset:submit", async (_evt, payload) => {
  const { email, lastKnownPassword, reportedAmount } = payload || {};
  if (!email) return { ok: false, error: "E-posta gerekli." };
  try {
    await connectDb();
    const norm = normalizeEmail(email);
    const existing = await PasswordResetRequest.findOne({ email: norm, status: "pending" });
    if (existing) return { ok: false, error: "Bu e-posta için zaten bekleyen bir talep var." };

    const user = await User.findOne({ email: norm });
    let score = 0;
    if (user) {
      score += 30;
      if (lastKnownPassword) {
        const computed = hashPassword(String(lastKnownPassword), user.passwordSalt);
        if (computed === user.passwordHash) score += 40;
      }
      if (Number(reportedAmount) > 0) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const recentOrders = await Order.find({ buyerId: user._id, status: "paid", createdAt: { $gte: threeDaysAgo } });
        const totalPaid = recentOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
        if (Math.abs(totalPaid - Number(reportedAmount)) < 1) score += 30;
        else if (Math.abs(totalPaid - Number(reportedAmount)) < 10) score += 15;
      }
    }
    await PasswordResetRequest.create({
      email: norm,
      userId: user?._id || null,
      lastKnownPassword: lastKnownPassword || "",
      reportedAmount: Number(reportedAmount) || 0,
      accuracyScore: score
    });
    return { ok: true, score };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("pwreset:set-password", async (_evt, { email, newPassword }) => {
  if (!email || !newPassword) return { ok: false, error: "Gerekli alanlar eksik." };
  if (String(newPassword).length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };
  try {
    await connectDb();
    const req = await PasswordResetRequest.findOne({ email: normalizeEmail(email), status: "approved" }).sort({ resolvedAt: -1 });
    if (!req) return { ok: false, error: "Onaylanmış talep bulunamadı." };
    if (!req.userId) return { ok: false, error: "Hesap bulunamadı." };
    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = hashPassword(String(newPassword), newSalt);
    await User.updateOne({ _id: req.userId }, { passwordSalt: newSalt, passwordHash: newHash });
    await PasswordResetRequest.updateOne({ _id: req._id }, { status: "completed", resolvedAt: new Date() });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("admin:pwreset-list", async () => {
  const err = requireAdmin();
  if (err) return err;
  try {
    await connectDb();
    const reqs = await PasswordResetRequest.find().sort({ createdAt: -1 }).limit(100);
    return {
      ok: true,
      requests: reqs.map(r => ({
        id:                r._id.toString(),
        email:             r.email,
        lastKnownPassword: r.lastKnownPassword,
        reportedAmount:    r.reportedAmount,
        accuracyScore:     r.accuracyScore,
        status:            r.status,
        adminNote:         r.adminNote,
        createdAt:         r.createdAt,
        resolvedAt:        r.resolvedAt
      }))
    };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("admin:pwreset-resolve", async (_evt, { requestId, action, adminNote }) => {
  const err = requireAdmin();
  if (err) return err;
  if (!requestId || !["approved", "rejected"].includes(action)) return { ok: false, error: "Geçersiz istek." };
  try {
    await connectDb();
    await PasswordResetRequest.updateOne(
      { _id: toId(requestId) },
      { status: action, adminNote: adminNote || "", resolvedAt: new Date() }
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("events:create", async (_evt, payload) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  const isAdmin = currentUser.isAdmin === 1;
  if (currentUser.role !== "organization" && !isAdmin) {
    return { ok: false, error: "Sadece organizasyonlar veya admin etkinlik oluşturabilir." };
  }

  const { name, venue, eventDate, capacity, standardPrice, vipPrice, description, imageUrl, discountThreshold, discountPercent } = payload || {};
  if (!name || !venue || !eventDate || !capacity) return { ok: false, error: "Ad, mekan, tarih ve kontenjan zorunlu." };

  const stdPrice = Number(standardPrice) || 0;
  const vPrice   = Number(vipPrice) || 0;
  const dThreshold = parseInt(discountThreshold) || 0;
  const dPercent   = Number(discountPercent) || 0;
  if (stdPrice < 0 || vPrice < 0) return { ok: false, error: "Fiyatlar negatif olamaz." };
  if (dPercent < 0 || dPercent > 100) return { ok: false, error: "İndirim oranı 0-100 arasında olmalı." };
  if (dThreshold < 0) return { ok: false, error: "İndirim eşiği negatif olamaz." };

  try {
    await connectDb();
    const event = await Event.create({
      organizerId: currentUser._id,
      name, venue,
      eventDate: new Date(eventDate),
      capacity: parseInt(capacity),
      standardPrice: stdPrice, vipPrice: vPrice,
      description: description || "", imageUrl: imageUrl || "",
      discountThreshold: dThreshold, discountPercent: dPercent
    });
    return { ok: true, eventId: event._id.toString() };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("events:update", async (_evt, payload) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  const { id, name, venue, eventDate, capacity, standardPrice, vipPrice, description, imageUrl, discountThreshold, discountPercent } = payload || {};
  if (!id || !name || !venue || !eventDate || !capacity) return { ok: false, error: "Tüm alanlar zorunlu." };

  try {
    await connectDb();
    const event = await Event.findById(toId(id));
    if (!event) return { ok: false, error: "Etkinlik bulunamadı." };
    if (event.organizerId.toString() !== currentUser.id && currentUser.isAdmin !== 1) {
      return { ok: false, error: "Bu etkinliği düzenleme yetkiniz yok." };
    }
    await Event.updateOne({ _id: toId(id) }, {
      name, venue, eventDate: new Date(eventDate), capacity: parseInt(capacity),
      standardPrice: Number(standardPrice) || 0, vipPrice: Number(vipPrice) || 0,
      description: description || "", imageUrl: imageUrl || "",
      discountThreshold: parseInt(discountThreshold) || 0, discountPercent: Number(discountPercent) || 0
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("events:delete", async (_evt, eventId) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  if (!eventId) return { ok: false, error: "Etkinlik ID gerekli." };
  try {
    await connectDb();
    const event = await Event.findById(toId(eventId));
    if (!event) return { ok: false, error: "Etkinlik bulunamadı." };
    if (event.organizerId.toString() !== currentUser.id && currentUser.isAdmin !== 1) {
      return { ok: false, error: "Bu etkinliği silme yetkiniz yok." };
    }
    const soldCount = await Order.countDocuments({ eventId: toId(eventId), status: "paid" });
    if (soldCount > 0) return { ok: false, error: "Satılmış biletleri olan etkinlik silinemez." };
    await Subscription.deleteMany({ eventId: toId(eventId) });
    await Event.deleteOne({ _id: toId(eventId) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("events:subscribe", async (_evt, eventId) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  if (!eventId) return { ok: false, error: "Etkinlik ID gerekli." };
  try {
    await connectDb();
    await Subscription.findOneAndUpdate(
      { userId: currentUser._id, eventId: toId(eventId) },
      { userId: currentUser._id, eventId: toId(eventId) },
      { upsert: true, new: true }
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("events:unsubscribe", async (_evt, eventId) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  if (!eventId) return { ok: false, error: "Etkinlik ID gerekli." };
  try {
    await connectDb();
    await Subscription.deleteOne({ userId: currentUser._id, eventId: toId(eventId) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("events:list", async () => {
  try {
    await connectDb();
    const userId  = currentUser?._id || null;
    const isAdmin = currentUser?.isAdmin === 1;
    const role    = currentUser?.role;

    const matchStage = (role === "organization" && !isAdmin)
      ? [{ $match: { organizerId: currentUser._id } }]
      : [];

    const pipeline = [
      ...matchStage,
      { $lookup: { from: "users", localField: "organizerId", foreignField: "_id", as: "organizer" } },
      { $unwind: { path: "$organizer", preserveNullAndEmptyArrays: true } },
      { $lookup: {
          from: "orders",
          let: { eid: "$_id" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$eventId", "$$eid"] }, { $eq: ["$status", "paid"] }] } } }],
          as: "paidOrders"
      }},
      { $lookup: { from: "subscriptions", localField: "_id", foreignField: "eventId", as: "subscriptions" } },
      { $addFields: {
          soldTickets:     { $sum: "$paidOrders.quantity" },
          totalRevenue:    { $sum: "$paidOrders.totalPrice" },
          subscriberCount: { $size: "$subscriptions" },
          isSubscribed: userId
            ? { $size: { $filter: { input: "$subscriptions", as: "s", cond: { $eq: ["$$s.userId", userId] } } } }
            : 0,
          organizerName: { $ifNull: ["$organizer.displayName", "—"] }
      }},
      { $sort: { eventDate: 1 } }
    ];

    const events = await Event.aggregate(pipeline);
    return {
      ok: true,
      events: events.map(e => ({
        id:                e._id.toString(),
        name:              e.name,
        venue:             e.venue,
        eventDate:         e.eventDate,
        capacity:          e.capacity,
        standardPrice:     e.standardPrice,
        vipPrice:          e.vipPrice,
        description:       e.description,
        imageUrl:          e.imageUrl,
        discountThreshold: e.discountThreshold,
        discountPercent:   e.discountPercent,
        organizerId:       e.organizerId.toString(),
        organizerName:     e.organizerName,
        createdAt:         e.createdAt,
        soldTickets:       e.soldTickets,
        totalRevenue:      e.totalRevenue,
        subscriberCount:   e.subscriberCount,
        isSubscribed:      e.isSubscribed
      }))
    };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

async function getBookedSeats(eventId) {
  const orders = await Order.find({ eventId: toId(eventId), status: "paid" }, "seatNumbers");
  const set = new Set();
  for (const o of orders) {
    const nums = String(o.seatNumbers || "").split(",").map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n) && n > 0);
    for (const n of nums) set.add(n);
  }
  return set;
}

async function getBookedSeatsByType(eventId) {
  const orders = await Order.find({ eventId: toId(eventId), status: "paid" }, "seatNumbers ticketType");
  const standard = new Set();
  const vip = new Set();
  for (const o of orders) {
    const nums = String(o.seatNumbers || "").split(",").map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n) && n > 0);
    const target = o.ticketType === "vip" ? vip : standard;
    for (const n of nums) target.add(n);
  }
  return { standard, vip };
}

ipcMain.handle("events:seats", async (_evt, eventId) => {
  if (!eventId) return { ok: false, error: "Etkinlik ID gerekli." };
  try {
    await connectDb();
    const event = await Event.findById(toId(eventId), "capacity");
    if (!event) return { ok: false, error: "Etkinlik bulunamadı." };
    const { standard, vip } = await getBookedSeatsByType(eventId);
    const all = [...standard, ...vip];
    return {
      ok: true,
      capacity: event.capacity,
      bookedSeats:    all.sort((a, b) => a - b),
      bookedStandard: Array.from(standard).sort((a, b) => a - b),
      bookedVip:      Array.from(vip).sort((a, b) => a - b)
    };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("orders:create", async (_evt, payload) => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };

  const { eventId, customerName, ticketType, quantity, seats } = payload || {};
  if (!eventId || !customerName || !ticketType) return { ok: false, error: "Tüm alanlar zorunlu." };
  if (!["standard", "vip"].includes(ticketType)) return { ok: false, error: "Geçersiz bilet türü." };

  const requestedSeats = Array.isArray(seats)
    ? seats.map(s => parseInt(s)).filter(n => !Number.isNaN(n) && n > 0)
    : [];
  const qty = requestedSeats.length > 0 ? requestedSeats.length : parseInt(quantity);
  if (!qty || qty < 1) return { ok: false, error: "Geçerli bilet adedi girin." };

  try {
    await connectDb();
    const event = await Event.findById(toId(eventId));
    if (!event) return { ok: false, error: "Etkinlik bulunamadı." };

    const booked = await getBookedSeats(eventId);
    const remaining = event.capacity - booked.size;
    if (qty > remaining) return { ok: false, error: `Yetersiz kontenjan. Kalan: ${remaining}` };

    let assignedSeats = [];
    if (requestedSeats.length > 0) {
      for (const n of requestedSeats) {
        if (n < 1 || n > event.capacity) return { ok: false, error: `Geçersiz koltuk numarası: ${n}` };
        if (booked.has(n)) return { ok: false, error: `${n} numaralı koltuk dolu.` };
      }
      assignedSeats = [...new Set(requestedSeats)].sort((a, b) => a - b);
    } else {
      for (let n = 1; n <= event.capacity && assignedSeats.length < qty; n++) {
        if (!booked.has(n)) assignedSeats.push(n);
      }
    }

    const unitPrice = ticketType === "vip" ? event.vipPrice : event.standardPrice;
    const subtotal  = unitPrice * qty;
    let discountApplied = 0;
    if (event.discountThreshold > 0 && qty >= event.discountThreshold && event.discountPercent > 0) {
      discountApplied = subtotal * (event.discountPercent / 100);
    }
    const totalPrice = subtotal - discountApplied;

    const order = await Order.create({
      eventId:      toId(eventId),
      buyerId:      currentUser._id,
      customerName, ticketType,
      quantity:     qty,
      totalPrice,
      seatNumbers:  assignedSeats
    });
    return { ok: true, orderId: order._id.toString(), totalPrice, subtotal, discountApplied, seats: assignedSeats };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("orders:list", async () => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  try {
    await connectDb();
    let matchFilter = {};
    if (currentUser.isAdmin !== 1) {
      if (currentUser.role === "organization") {
        const orgEvents = await Event.find({ organizerId: currentUser._id }, "_id");
        matchFilter = { eventId: { $in: orgEvents.map(e => e._id) } };
      } else {
        matchFilter = { buyerId: currentUser._id };
      }
    }

    const orders = await Order.find(matchFilter)
      .populate("eventId", "name")
      .sort({ createdAt: -1 })
      .limit(100);

    return {
      ok: true,
      orders: orders.map(o => ({
        id:           o._id.toString(),
        eventName:    o.eventId?.name || "—",
        customerName: o.customerName,
        ticketType:   o.ticketType,
        quantity:     o.quantity,
        totalPrice:   o.totalPrice,
        status:       o.status,
        seatNumbers:  o.seatNumbers.join(","),
        createdAt:    o.createdAt
      }))
    };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("stats:summary", async () => {
  if (!currentUser) return { ok: false, error: "Giriş yapmalısınız." };
  try {
    await connectDb();
    const role    = currentUser.role;
    const isAdmin = currentUser.isAdmin === 1;

    if (role === "individual" && !isAdmin) {
      const [agg] = await Order.aggregate([
        { $match: { buyerId: currentUser._id, status: "paid" } },
        { $group: { _id: null, totalSpent: { $sum: "$totalPrice" }, ticketsBought: { $sum: "$quantity" }, orderCount: { $sum: 1 } } }
      ]);
      const subscriptionCount = await Subscription.countDocuments({ userId: currentUser._id });
      return {
        ok: true, scope: "individual",
        totalSpent:        agg?.totalSpent        || 0,
        ticketsBought:     agg?.ticketsBought     || 0,
        orderCount:        agg?.orderCount        || 0,
        subscriptionCount
      };
    }

    const eventFilter = (role === "organization" && !isAdmin) ? { organizerId: currentUser._id } : {};
    const orgEvents   = await Event.find(eventFilter, "_id capacity");
    const eventIds    = orgEvents.map(e => e._id);
    const totalCapacity = orgEvents.reduce((s, e) => s + e.capacity, 0);

    const orderFilter = eventIds.length ? { eventId: { $in: eventIds } } : {};

    const [revAgg] = await Order.aggregate([
      { $match: { ...orderFilter, status: "paid" } },
      { $group: { _id: null, revenue: { $sum: "$totalPrice" }, ticketsSold: { $sum: "$quantity" } } }
    ]);
    const pending = await Order.countDocuments({ ...orderFilter, status: "pending" });

    return {
      ok: true,
      scope:         isAdmin ? "admin" : "organization",
      revenue:       revAgg?.revenue     || 0,
      ticketsSold:   revAgg?.ticketsSold || 0,
      totalCapacity,
      pending
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
