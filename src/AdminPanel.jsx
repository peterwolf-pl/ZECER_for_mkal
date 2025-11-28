import React, { useEffect, useState } from "react";

export default function AdminPanel({ onCalibrate }) {
  const [eggs, setEggs] = useState([]);
  const [triggerWord, setTriggerWord] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Pobranie istniejących easter eggów
  useEffect(() => {
    const fetchEggs = async () => {
      try {
        const res = await fetch("/api/eastereggs.php", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.error("GET /api/eastereggs.php status:", res.status);
          return;
        }

        const text = await res.text();
        if (!text) return;

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("Niepoprawny JSON z /api/eastereggs.php:", text);
          return;
        }

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.eggs)
          ? data.eggs
          : [];

        setEggs(
          list.map((e, index) => ({
            id: e.id ?? index,
            trigger_word: e.trigger_word || e.trigger || e.word || "",
            url: e.url || e.src || "",
            type: e.type || "",
          }))
        );
      } catch (err) {
        console.error("Błąd pobierania easter eggów:", err);
      }
    };

    fetchEggs();
  }, []);

  const handleAddEgg = async (e) => {
    e.preventDefault();
    clearMessages();

    const tw = (triggerWord || "").trim();
    const link = (url || "").trim();

    if (!tw || !link) {
      setErrorMsg("Podaj słowo wyzwalające i link.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/eastereggs.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "add",
          trigger_word: tw,
          url: link,
        }),
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        console.warn("Nie-JSON odpowiedź (add):", text);
      }

      if (!res.ok || (data && data.error)) {
        console.error("Błąd zapisu easter egga:", data || text);
        setErrorMsg(
          (data && data.error) ||
            "Nie udało się zapisać easter egga."
        );
        return;
      }

      const created = (data && (data.egg || data.created)) || null;
      const newEgg = {
        id: created?.id || Date.now(),
        trigger_word: tw,
        url: link,
        type: created?.type || "",
      };

      setEggs((prev) => [...prev, newEgg]);
      setTriggerWord("");
      setUrl("");
      setSuccessMsg("Easter egg zapisany.");
    } catch (err) {
      console.error("Wyjątek przy zapisie easter egga:", err);
      setErrorMsg("Błąd połączenia podczas zapisu.");
    } finally {
      setSaving(false);
    }
  };

  const handleEggFieldChange = (id, field, value) => {
    setEggs((prev) =>
      prev.map((egg) =>
        String(egg.id) === String(id)
          ? { ...egg, [field]: value }
          : egg
      )
    );
    clearMessages();
  };

  const handleUpdateEgg = async (id) => {
    clearMessages();
    const egg = eggs.find((e) => String(e.id) === String(id));
    if (!egg) return;

    const tw = (egg.trigger_word || "").trim();
    const link = (egg.url || "").trim();

    if (!tw || !link) {
      setErrorMsg("Słowo wyzwalające i link nie mogą być puste.");
      return;
    }

    try {
      const res = await fetch("/api/eastereggs.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "update",
          id,
          trigger_word: tw,
          url: link,
        }),
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        console.warn("Nie-JSON odpowiedź (update):", text);
      }

      if (!res.ok || (data && data.error)) {
        console.error("Błąd aktualizacji easter egga:", data || text);
        setErrorMsg(
          (data && data.error) ||
            "Nie udało się zaktualizować easter egga."
        );
        return;
      }

      setSuccessMsg("Easter egg zaktualizowany.");
    } catch (err) {
      console.error("Wyjątek przy aktualizacji easter egga:", err);
      setErrorMsg("Błąd połączenia podczas aktualizacji.");
    }
  };

  const handleDeleteEgg = async (id) => {
    clearMessages();
    if (!id) return;

    try {
      const res = await fetch("/api/eastereggs.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          id,
        }),
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        console.warn("Nie-JSON odpowiedź (delete):", text);
      }

      if (!res.ok || (data && data.error)) {
        console.error("Błąd kasowania easter egga:", data || text);
        setErrorMsg(
          (data && data.error) ||
            "Nie udało się usunąć easter egga."
        );
        return;
      }

      setEggs((prev) => prev.filter((e) => String(e.id) !== String(id)));
      setSuccessMsg("Easter egg usunięty.");
    } catch (err) {
      console.error("Wyjątek przy kasowaniu easter egga:", err);
      setErrorMsg("Błąd połączenia podczas usuwania.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px 60px",
        boxSizing: "border-box",
        fontFamily: "GrohmanGrotesk-Classic, system-ui, sans-serif",
      }}
    >
      {/* Nagłówek */}
      <h2
        style={{
          fontSize: "2rem",
          color: "#000",
          textAlign: "center",
          marginBottom: "0.5rem",
        }}
      >
        Panel administracyjny
      </h2>

      {/* Sekcja kalibracji */}
      <h3
        style={{
          fontSize: "1.4rem",
          color: "#000",
          textAlign: "center",
          marginTop: 0,
        }}
      >
        Wybierz kasztę do kalibracji:
      </h3>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          marginTop: "1rem",
          marginBottom: "3rem",
        }}
      >
        <img
          src="/assets/kaszta.png"
          alt="Kaszta"
          style={{ width: "260px", cursor: "pointer" }}
          onClick={() => onCalibrate && onCalibrate("kaszta")}
        />
        <img
          src="/assets/kaszta_szuflada.png"
          alt="Kaszta szuflada"
          style={{ width: "260px", cursor: "pointer" }}
          onClick={() => onCalibrate && onCalibrate("szuflada")}
        />
      </div>

      {/* Sekcja Easter Eggów */}
      <h3
        style={{
          fontSize: "1.6rem",
          color: "#000",
          textAlign: "center",
          marginBottom: "1rem",
        }}
      >
        Easter eggi (słowo wyzwalające → link)
      </h3>

      {/* Formularz dodawania */}
      <form
        onSubmit={handleAddEgg}
        style={{
          maxWidth: 720,
          margin: "0 auto 20px",
          padding: "16px 18px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 160px" }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 2,
              }}
            >
              Słowo wyzwalające
            </label>
            <input
              type="text"
              value={triggerWord}
              onChange={(e) => setTriggerWord(e.target.value)}
              placeholder="np. zecer"
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ flex: "2 1 260px" }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 2,
              }}
            >
              Link
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube lub inny adres"
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 4,
          }}
        >
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              border: "1px solid #444",
              background: "#111",
              color: "#fff",
              fontSize: 14,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Zapisuję" : "Dodaj / Zapisz"}
          </button>
        </div>
      </form>

      {/* Komunikaty akcji */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto 10px",
          minHeight: 20,
        }}
      >
        {errorMsg && (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              background: "#ffebee",
              color: "#c62828",
              fontSize: 13,
            }}
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              background: "#e8f5e9",
              color: "#2e7d32",
              fontSize: 13,
            }}
          >
            {successMsg}
          </div>
        )}
      </div>

      {/* Lista z edycją */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "10px 0 40px",
        }}
      >
        {eggs.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 4px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Słowo wyzwalające
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 4px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Link
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 4px",
                    borderBottom: "1px solid #ddd",
                    width: 120,
                  }}
                >
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {eggs.map((egg) => (
                <tr key={egg.id}>
                  <td
                    style={{
                      padding: "4px",
                      borderBottom: "1px solid #f0f0f0",
                      verticalAlign: "top",
                    }}
                  >
                    <input
                      type="text"
                      value={egg.trigger_word}
                      onChange={(e) =>
                        handleEggFieldChange(
                          egg.id,
                          "trigger_word",
                          e.target.value
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        borderRadius: 3,
                        border: "1px solid #ddd",
                        fontSize: 12,
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "4px",
                      borderBottom: "1px solid #f0f0f0",
                      verticalAlign: "top",
                    }}
                  >
                    <input
                      type="text"
                      value={egg.url}
                      onChange={(e) =>
                        handleEggFieldChange(
                          egg.id,
                          "url",
                          e.target.value
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        borderRadius: 3,
                        border: "1px solid #ddd",
                        fontSize: 12,
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "4px",
                      borderBottom: "1px solid #f0f0f0",
                      verticalAlign: "top",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <button
                        onClick={() => handleUpdateEgg(egg.id)}
                        style={{
                          padding: "2px 8px",
                          fontSize: 11,
                          borderRadius: 3,
                          border: "1px solid #1976d2",
                          background: "#e3f2fd",
                          color: "#0d47a1",
                          cursor: "pointer",
                        }}
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => handleDeleteEgg(egg.id)}
                        style={{
                          padding: "2px 8px",
                          fontSize: 11,
                          borderRadius: 3,
                          border: "1px solid #b71c1c",
                          background: "#ffebee",
                          color: "#b71c1c",
                          cursor: "pointer",
                        }}
                      >
                        Usuń
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {eggs.length === 0 && (
          <p
            style={{
              fontSize: 13,
              color: "#555",
            }}
          >
            Brak zdefiniowanych easter eggów.
          </p>
        )}
      </div>
    </div>
  );
}