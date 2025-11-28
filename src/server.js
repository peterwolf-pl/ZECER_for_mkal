// server.js

const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

// konfiguracja bazy
const dbConfig = {
  host: "localhost",
  user: "srv51934_zecer_mkal",
  password: "A9SNNj9M4hzZTXwTX5Z7",
  database: "srv51934_zecer_mkal",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

// inicjalizacja puli i tabeli
async function initDb() {
  pool = await mysql.createPool(dbConfig);

  await pool.query(
    `CREATE TABLE IF NOT EXISTS hall_of_fame (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      letters INT NOT NULL,
      time_ms INT NOT NULL,
      accuracy INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );
}

// sortowanie identyczne jak na froncie
// 1. wyzsza dokladnosc
// 2. wiecej liter
// 3. krotszy czas (timeMs)
function sortResults(a, b) {
  if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
  if (b.letters !== a.letters) return b.letters - a.letters;
  return a.timeMs - b.timeMs;
}

// mapowanie wiersza z bazy na obiekt
function mapRow(r) {
  return {
    id: r.id,
    name: r.name,
    letters: Number(r.letters),
    timeMs: Number(r.timeMs),
    accuracy: Number(r.accuracy),
    created_at: r.created_at,
  };
}

// GET /api/hof - zwraca TOP 10
app.get("/api/hof", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, letters, time_ms AS timeMs, accuracy, created_at FROM hall_of_fame"
    );

    const sorted = rows.map(mapRow).sort(sortResults).slice(0, 10);
    res.json(sorted);
  } catch (err) {
    console.error("GET /api/hof error", err);
    res.status(500).json([]);
  }
});

// POST /api/hof - dodaje wpis jesli lapie sie do TOP 10
app.post("/api/hof", async (req, res) => {
  try {
    const { name, letters, timeMs, accuracy } = req.body || {};

    if (
      !name ||
      typeof name !== "string" ||
      !Number.isFinite(letters) ||
      !Number.isFinite(timeMs) ||
      !Number.isFinite(accuracy)
    ) {
      return res
        .status(400)
        .json({ accepted: false, error: "Invalid payload" });
    }

    const cleanName = String(name).trim();
    const candidate = {
      name: cleanName,
      letters: Number(letters),
      timeMs: Number(timeMs),
      accuracy: Number(accuracy),
    };

    // pobierz obecne wyniki
    const [rows] = await pool.query(
      "SELECT id, name, letters, time_ms AS timeMs, accuracy, created_at FROM hall_of_fame"
    );
    const current = rows.map(mapRow).sort(sortResults);

    // jesli mniej niz 10 rekordow, kandydat wchodzi z automatu
    if (current.length < 10) {
      const [insertResult] = await pool.query(
        "INSERT INTO hall_of_fame (name, letters, time_ms, accuracy) VALUES (?, ?, ?, ?)",
        [candidate.name, candidate.letters, candidate.timeMs, candidate.accuracy]
      );

      const [rowsAfter] = await pool.query(
        "SELECT id, name, letters, time_ms AS timeMs, accuracy, created_at FROM hall_of_fame"
      );
      const top10After = rowsAfter.map(mapRow).sort(sortResults).slice(0, 10);

      return res.json({
        accepted: true,
        id: insertResult.insertId,
        top10: top10After,
      });
    }

    // jesli 10 lub wiecej wynikow, obliczamy ranking z kandydatem
    const combined = [...current, candidate].sort(sortResults);

    // pozycja kandydata w kombinacji
    const candidateIndex = combined.findIndex(
      (r) =>
        r.name === candidate.name &&
        r.letters === candidate.letters &&
        r.timeMs === candidate.timeMs &&
        r.accuracy === candidate.accuracy
    );

    const qualifies =
      candidateIndex !== -1 && candidateIndex < 10;

    if (!qualifies) {
      // nie wchodzi do top 10, nie zapisujemy
      const top10 = combined.slice(0, 10);
      return res.json({
        accepted: false,
        top10,
      });
    }

    // kandydat kwalifikuje sie do top 10 - zapis
    const [insertResult] = await pool.query(
      "INSERT INTO hall_of_fame (name, letters, time_ms, accuracy) VALUES (?, ?, ?, ?)",
      [candidate.name, candidate.letters, candidate.timeMs, candidate.accuracy]
    );

    // odswiezona lista po insercie
    const [rowsAfter] = await pool.query(
      "SELECT id, name, letters, time_ms AS timeMs, accuracy, created_at FROM hall_of_fame"
    );
    const top10After = rowsAfter.map(mapRow).sort(sortResults).slice(0, 10);

    res.json({
      accepted: true,
      id: insertResult.insertId,
      top10: top10After,
    });
  } catch (err) {
    console.error("POST /api/hof error", err);
    res.status(500).json({ accepted: false });
  }
});

// statyczne pliki gry (podmien sciezke na swoj build produkcyjny)
app.use(express.static(path.join(__dirname, "build")));

const PORT = process.env.PORT || 3001;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log("HoF server running on port " + PORT);
    });
  })
  .catch((err) => {
    console.error("DB init error", err);
    process.exit(1);
  });