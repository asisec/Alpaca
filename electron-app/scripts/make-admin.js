  const sqlite3 = require("sqlite3");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const sqlitePath = process.env.SQLITE_PATH;
if (!sqlitePath) {
  console.error("SQLITE_PATH tanımlı değil");
  process.exit(1);
}

const dbPath = path.isAbsolute(sqlitePath)
  ? sqlitePath
  : path.resolve(path.join(__dirname, "..", ".."), sqlitePath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("DB bağlantı hatası:", err);
    process.exit(1);
  }
});

const email = "ali@ali.com";

// Önce kullanıcının ID'sini bul
db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
  if (err) {
    console.error("Sorgu hatası:", err);
    db.close();
    process.exit(1);
  }

  if (!row) {
    console.error(`${email} kullanıcısı bulunamadı`);
    db.close();
    process.exit(1);
  }

  console.log(`Kullanıcı bulundu: ID=${row.id}`);

  // is_admin alanını ekle (yoksa)
  db.run("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("ALTER TABLE hatası:", err);
    }

    // Kullanıcıyı admin yap
    db.run("UPDATE users SET is_admin = 1 WHERE email = ?", [email], (err) => {
      if (err) {
        console.error("UPDATE hatası:", err);
        db.close();
        process.exit(1);
      }

      console.log(`${email} başarıyla admin yapıldı`);
      db.close();
    });
  });
});
