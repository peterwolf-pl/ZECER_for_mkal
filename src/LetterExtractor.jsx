import React, { useRef, useState, useEffect } from "react";

const KASZTA_WIDTH = 2222;
const KASZTA_HEIGHT = 1521;
const SLOTS_COUNT = 20;
const LINE_OFFSET_RIGHT = 340;
const LINE_OFFSET_BOTTOM = 240;
const WIERSZOWNIK_SRC = "/assets/wierszownik.jpg";

function getImageSize(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.width, height: img.height || 96 });
    img.src = src;
  });
}

function getTimeMs(r) {
  if (typeof r.timeMs === "number") return r.timeMs;
  if (typeof r.time_ms === "number") return r.time_ms;
  if (typeof r.time === "number") return r.time * 1000;
  return 0;
}

function sortResults(a, b) {
  const accA = typeof a.accuracy === "number" ? a.accuracy : 0;
  const accB = typeof b.accuracy === "number" ? b.accuracy : 0;

  if (accB !== accA) return accB - accA;

  const lettersA = typeof a.letters === "number" ? a.letters : 0;
  const lettersB = typeof b.letters === "number" ? b.letters : 0;

  if (lettersB !== lettersA) return lettersB - lettersA;

  const tA = getTimeMs(a);
  const tB = getTimeMs(b);
  return tA - tB;
}

function formatTime(ms) {
  const safe = ms > 0 ? ms : 0;
  const s = Math.floor(safe / 1000);
  const rest = safe % 1000;
  const padded = rest.toString().padStart(3, "0");
  return `${s}s : ${padded}ms`;
}

export default function LetterExtractor({
  onBack,
  initialLine = [],
  kasztaImage = "/assets/kaszta_szuflada.png",
  pozSrc = "/poz_szuflada.json",
}) {
  const [letterFields, setLetterFields] = useState([]);
  const [slots, setSlots] = useState(Array(SLOTS_COUNT).fill(null));
  const [activeLetter, setActiveLetter] = useState(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0, visible: false });
  const [isDragging, setIsDragging] = useState(false);
  const [pickupAnim, setPickupAnim] = useState(false);

  const kasztaRef = useRef();
  const wierszownikRef = useRef();

  const [kasztaW, setKasztaW] = useState(KASZTA_WIDTH);
  const [wierszownikDims, setWierszownikDims] = useState({
    width: 1,
    height: 1,
  });
  const [isHelperVisible, setIsHelperVisible] = useState(false);

  const [greenScore, setGreenScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const saved = window.sessionStorage.getItem("zecer_le_green");
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  });

  const [redScore, setRedScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const saved = window.sessionStorage.getItem("zecer_le_red");
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem("zecer_le_green", String(greenScore));
    } catch (e) {}
  }, [greenScore]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem("zecer_le_red", String(redScore));
    } catch (e) {}
  }, [redScore]);

  const [timerActive, setTimerActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [runStartGreen, setRunStartGreen] = useState(0);
  const [runStartRed, setRunStartRed] = useState(0);
  const [initialLettersCount, setInitialLettersCount] = useState(0);

  const [showResultPopup, setShowResultPopup] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [hallOfFame, setHallOfFame] = useState([]);
  const [pendingHoF, setPendingHoF] = useState(null);
  const [playerNameInput, setPlayerNameInput] = useState("");

  const [showHallOfFamePopup, setShowHallOfFamePopup] = useState(false);

  const goodSoundRef = useRef(null);
  const errorSoundRef = useRef(null);
  const finishSoundRef = useRef(null);

  const playGood = () => {
    const audio = goodSoundRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const playError = () => {
    const audio = errorSoundRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const playFinish = () => {
    const audio = finishSoundRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const handlePrintHelper = () => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      console.warn("[LetterExtractor] Nie udalo sie otworzyc okna drukowania.");
      return;
    }

    const helperSrc = "/assets/helper.png";

    printWindow.document.write(
      "<!DOCTYPE html>" +
        "<html>" +
        "<head>" +
        '<meta charSet="utf-8" />' +
        "<title>Drukuj podpowiedz</title>" +
        "<style>" +
        "@page { size: A4; margin: 0; }" +
        "html, body { margin: 0; padding: 0; height: 100%; }" +
        "body { display: flex; align-items: center; justify-content: center; background: #fff; }" +
        "img { width: 100%; height: 100%; object-fit: contain; }" +
        "</style>" +
        "</head>" +
        "<body>" +
        '<img src="' +
        helperSrc +
        '" alt="Podpowiedz" id="helper-image" />' +
        "<script>" +
        "function printAndClose() { setTimeout(function() { window.focus(); window.print(); }, 150); }" +
        "const img = document.getElementById('helper-image');" +
        "if (img.complete) { printAndClose(); } else { img.addEventListener('load', printAndClose); }" +
        "window.addEventListener('afterprint', function() { window.close(); });" +
        "</scr" +
        "ipt>" +
        "</body>" +
        "</html>"
    );

    printWindow.document.close();
  };

  useEffect(() => {
    const img = new window.Image();
    img.onload = () =>
      setWierszownikDims({ width: img.width, height: img.height });
    img.src = WIERSZOWNIK_SRC;
  }, []);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      const vw = window.innerWidth * 0.95;
      const footerH = 38 + 20;
      const wierszownikMinH = 140;
      const gap = 16 + 16;
      const maxH = window.innerHeight - footerH - wierszownikMinH - gap;
      const kasztaWbyH = maxH * (KASZTA_WIDTH / KASZTA_HEIGHT);
      setKasztaW(Math.min(KASZTA_WIDTH, vw, kasztaWbyH));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const base =
      typeof window !== "undefined" ? window.location.href : "http://localhost";
    let resolvedPoz = pozSrc;
    try {
      resolvedPoz = new URL(pozSrc, base).href;
    } catch (urlError) {
      console.warn(
        "[LetterExtractor] Nie udalo sie zbudowac sciezki do pliku pozycji:",
        urlError
      );
    }

    fetch(pozSrc)
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            "Nie udalo sie pobrac pol (" + res.status + ") z " + resolvedPoz
          );
        }
        return res.json();
      })
      .then((data) => {
        const fields = Array.isArray(data) ? data : [];
        setLetterFields(fields);
      })
      .catch((error) => {
        console.error("[LetterExtractor] Blad podczas pobierania pol:", error);
        setLetterFields([]);
      });
  }, [pozSrc]);

  const fetchHallOfFame = async () => {
    try {
      const res = await fetch("/api/hof.php");
      if (!res.ok) {
        console.error("HOF GET status:", res.status);
        return;
      }
      const data = await res.json();
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data.top10)) {
        list = data.top10;
      }
      setHallOfFame(list.sort(sortResults).slice(0, 10));
    } catch (e) {
      console.error("HOF GET error:", e);
    }
  };

  useEffect(() => {
    fetchHallOfFame();
  }, []);

  useEffect(() => {
    if (!initialLine || initialLine.length === 0) {
      setSlots(Array(SLOTS_COUNT).fill(null));
      setInitialLettersCount(0);
      setTimerActive(false);
      setStartTime(null);
      setElapsedMs(0);
      return;
    }

    const nextSlots = Array(SLOTS_COUNT).fill(null);
    const count = Math.min(SLOTS_COUNT, initialLine.length);

    for (let i = 0; i < count; i++) {
      const letter = initialLine[i];
      if (!letter) continue;
      nextSlots[i] = {
        id: (letter.char || "?") + "-" + i + "-" + Date.now(),
        char: letter.char || "?",
        img: letter.img,
        width: letter.width || 96,
        height: letter.height || 96,
      };
    }

    setSlots(nextSlots);
    setInitialLettersCount(count);
    setTimerActive(false);
    setStartTime(null);
    setElapsedMs(0);
    setRunStartGreen(greenScore);
    setRunStartRed(redScore);
    setShowResultPopup(false);
    setPendingHoF(null);
  }, [initialLine]); // eslint-disable-line react-hooks/exhaustive-deps

  const kasztaScale = kasztaW / KASZTA_WIDTH;
  const kasztaH = kasztaW * (KASZTA_HEIGHT / KASZTA_WIDTH);

  const lineW = kasztaW * 0.8;
  const wierszScale = lineW / wierszownikDims.width;
  const lineH = wierszownikDims.height * wierszScale;
  const letterScale = wierszScale;
  const offsetRight = LINE_OFFSET_RIGHT * wierszScale;
  const baseline = lineH - LINE_OFFSET_BOTTOM * wierszScale;

  useEffect(() => {
    if (!timerActive || !startTime) return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 50);

    return () => clearInterval(interval);
  }, [timerActive, startTime]);

  const handleSlotDragStart = async (slotIndex, slot, e) => {
    if (!slot) return;
    e.preventDefault();

    if (!timerActive && !startTime) {
      const now = Date.now();
      setTimerActive(true);
      setStartTime(now);
      setElapsedMs(0);
      setRunStartGreen(greenScore);
      setRunStartRed(redScore);
    }

    let clientX = 0;
    let clientY = 0;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const { width, height } = await getImageSize(slot.img);

    setActiveLetter({
      ...slot,
      width,
      height: height || slot.height || 96,
      slotIndex,
    });
    setPickupAnim(true);
    setTimeout(() => setPickupAnim(false), 300);

    setGhostPos({ x: clientX, y: clientY, visible: true });
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const moveGhost = (e) => {
      setGhostPos((prev) => ({
        x: e.clientX,
        y: e.clientY,
        visible: prev.visible,
      }));
    };

    const moveGhostTouch = (e) => {
      if (e.touches && e.touches[0]) {
        setGhostPos((prev) => ({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          visible: prev.visible,
        }));
      }
    };

    const handleDrop = (e) => {
      let x = 0;
      let y = 0;
      if (e.changedTouches && e.changedTouches[0]) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
      } else if (e.clientX && e.clientY) {
        x = e.clientX;
        y = e.clientY;
      }
      finalizeDrop(x, y);
    };

    document.addEventListener("mousemove", moveGhost);
    document.addEventListener("touchmove", moveGhostTouch, { passive: false });
    document.addEventListener("mouseup", handleDrop);
    document.addEventListener("touchend", handleDrop, { passive: false });

    return () => {
      document.removeEventListener("mousemove", moveGhost);
      document.removeEventListener("touchmove", moveGhostTouch);
      document.removeEventListener("mouseup", handleDrop);
      document.removeEventListener("touchend", handleDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, activeLetter, letterFields, kasztaScale]);

  const finalizeDrop = (x, y) => {
    if (!activeLetter) {
      resetGhost();
      return;
    }

    let scored = false;
    let removeFromSlots = false;

    if (kasztaRef.current) {
      const rect = kasztaRef.current.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const relX = x - rect.left;
        const relY = y - rect.top;

        const hitField = letterFields.find((field) => {
          const left = Math.min(field.x1, field.x2) * kasztaScale;
          const top = Math.min(field.y1, field.y2) * kasztaScale;
          const width = Math.abs(field.x2 - field.x1) * kasztaScale;
          const height = Math.abs(field.y2 - field.y1) * kasztaScale;
          return (
            relX >= left &&
            relX <= left + width &&
            relY >= top &&
            relY <= top + height
          );
        });

        if (hitField) {
          const targetChar = typeof hitField.char === "string" ? hitField.char : null;
          if (!targetChar || targetChar === activeLetter.char) {
            setGreenScore((v) => v + 1);
            playGood();
            scored = true;
          } else {
            setRedScore((v) => v + 1);
            playError();
            scored = true;
          }
        } else {
          setRedScore((v) => v + 1);
          playError();
          scored = true;
        }

        removeFromSlots = true;
      }
    }

    if (!scored && removeFromSlots) {
      setRedScore((v) => v + 1);
      playError();
    }

    if (removeFromSlots && typeof activeLetter.slotIndex === "number") {
      setSlots((prev) => {
        const next = [...prev];
        next[activeLetter.slotIndex] = null;

        if (timerActive && startTime && next.every((s) => s === null)) {
          finishRun();
        }

        return next;
      });
    }

    resetGhost();
  };

  const finishRun = () => {
    if (!startTime) return;

    const end = Date.now();
    const elapsed = Math.max(1, end - startTime);

    const usedLetters = initialLettersCount || 0;

    const runGreen = Math.max(0, greenScore - runStartGreen);
    const runRed = Math.max(0, redScore - runStartRed);
    const attempts = runGreen + runRed;

    const accuracy =
      attempts > 0 ? Math.round((runGreen / attempts) * 100) : 0;

    const result = {
      letters: usedLetters,
      timeMs: elapsed,
      accuracy,
      timestamp: Date.now(),
    };

    setElapsedMs(elapsed);
    setLastResult(result);
    setShowResultPopup(true);
    setTimerActive(false);
    setStartTime(null);

    playFinish();

    const candidate = result;
    const combined = [...hallOfFame, candidate].sort(sortResults);
    const top10 = combined.slice(0, 10);
    const qualifies = top10.includes(candidate);

    if (qualifies) {
      setPendingHoF({ candidate });
    } else {
      setPendingHoF(null);
    }
  };

  const resetGhost = () => {
    setActiveLetter(null);
    setGhostPos({ x: 0, y: 0, visible: false });
    setIsDragging(false);
  };

  function handleKasztaBackgroundClick() {
    resetGhost();
  }

  // wyjscie z LetterExtractor resetuje punkty i timer
  const handleBackClick = () => {
    const remainingLetters = slots
      .filter(Boolean)
      .map((slot) => ({
        char: slot.char,
        img: slot.img,
        width: slot.width,
        height: slot.height,
      }));

    if (typeof onBack === "function") {
      onBack(remainingLetters);
    }

    setSlots(Array(SLOTS_COUNT).fill(null));
    setActiveLetter(null);
    setGhostPos({ x: 0, y: 0, visible: false });
    setIsDragging(false);
    setTimerActive(false);
    setStartTime(null);
    setElapsedMs(0);

    setGreenScore(0);
    setRedScore(0);

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("zecer_le_green", "0");
        window.sessionStorage.setItem("zecer_le_red", "0");
      } catch (e) {}
    }
  };

  function renderLettersOnLine() {
    let right = 0;
    const visible = [];

    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i];
      if (!slot) continue;

      const w = (slot.width || 96) * letterScale;
      const h = (slot.height || 96) * letterScale;
      right += w;

      visible.push(
        <div
          key={slot.id}
          style={{
            position: "absolute",
            left: lineW - offsetRight - right,
            top: baseline - h,
            width: w,
            height: h,
            zIndex: 3,
            cursor: "grab",
          }}
          onMouseDown={(e) => handleSlotDragStart(i, slot, e)}
          onTouchStart={(e) => handleSlotDragStart(i, slot, e)}
          title="Przeciagnij czcionke na kaszte"
        >
          <img
            src={slot.img}
            alt={slot.char}
            width={w}
            height={h}
            draggable={false}
            style={{ display: "block", pointerEvents: "none" }}
          />
        </div>
      );
    }

    return visible.reverse();
  }

  const renderGhostLetter = () => {
    if (!activeLetter || !ghostPos.visible) return null;
    return (
      <img
        src={activeLetter.img}
        alt={activeLetter.char}
        style={{
          position: "fixed",
          left:
            ghostPos.x -
            (activeLetter.width * letterScale) / 2,
          top:
            ghostPos.y -
            ((activeLetter.height || 96) *
              letterScale) /
              2,
          width: activeLetter.width * letterScale,
          height:
            (activeLetter.height || 96) *
            letterScale,
          pointerEvents: "none",
          zIndex: 1000,
          opacity: 1,
          filter: "drop-shadow(2px 2px 2px #999)",
          animation: pickupAnim
            ? "letter-pop 0.3s ease-out forwards"
            : undefined,
        }}
      />
    );
  };

  const handleSaveHoF = async () => {
    const name = (playerNameInput || "").trim();
    if (!pendingHoF || !name) return;

    const { candidate } = pendingHoF;
    const payload = {
      name,
      letters: candidate.letters,
      timeMs: candidate.timeMs,
      accuracy: candidate.accuracy,
    };

    try {
      const res = await fetch("/api/hof.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("HOF POST status:", res.status);
        return;
      }

      const data = await res.json();

      let list = [];
      if (Array.isArray(data.top10)) {
        list = data.top10;
      } else if (Array.isArray(data)) {
        list = data;
      }

      if (list.length > 0) {
        setHallOfFame(list.sort(sortResults).slice(0, 10));
      } else {
        await fetchHallOfFame();
      }

      setPendingHoF(null);
      setPlayerNameInput("");
    } catch (e) {
      console.error("HOF POST error:", e);
    }
  };

  const handleShowHallOfFameFromButton = async () => {
    await fetchHallOfFame();
    playFinish();

    setShowHallOfFamePopup(true);

    setTimerActive(false);
    setStartTime(null);
    setElapsedMs(0);

    setGreenScore(0);
    setRedScore(0);

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("zecer_le_green", "0");
        window.sessionStorage.setItem("zecer_le_red", "0");
      } catch (e) {}
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "stretch",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <audio ref={goodSoundRef} src="/assets/good.mp3" preload="auto" />
      <audio ref={errorSoundRef} src="/assets/error.mp3" preload="auto" />
      <audio ref={finishSoundRef} src="/assets/1.mp3" preload="auto" />

      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
          width: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          ref={kasztaRef}
          style={{
            position: "relative",
            width: kasztaW,
            height: kasztaH,
            margin: "0 auto",
            border: "0px solid #d1d5db",
            borderRadius: 8,
            overflow: "hidden",
            background: "none",
            touchAction: "none",
            flexShrink: 0,
          }}
        >
          <div
            onClick={handleKasztaBackgroundClick}
            onTouchEnd={handleKasztaBackgroundClick}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              zIndex: 1,
              background: "transparent",
            }}
          />
          <img
            src={kasztaImage}
            alt="Kaszta zecerska"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              pointerEvents: "none",
            }}
          />
          {letterFields.map((field) => (
            <div
              key={
                (field.char || "?") +
                field.x1 +
                field.y1 +
                field.x2 +
                field.y2
              }
              style={{
                position: "absolute",
                left: Math.min(field.x1, field.x2) * kasztaScale,
                top: Math.min(field.y1, field.y2) * kasztaScale,
                width: Math.abs(field.x2 - field.x1) * kasztaScale,
                height: Math.abs(field.y2 - field.y1) * kasztaScale,
                border: "0px solid rgba(37,99,235,0.4)",
                background: "rgba(96,165,250,0.0)",
                borderRadius: "10px",
                zIndex: 2,
                boxSizing: "border-box",
                pointerEvents: "none",
              }}
            />
          ))}
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: 0,
          }}
        >
          <div
            ref={wierszownikRef}
            style={{
              position: "relative",
              width: lineW,
              height: lineH,
              margin: "1px auto 0px auto",
              touchAction: "none",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            <img
              src={WIERSZOWNIK_SRC}
              alt="Wierszownik"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                pointerEvents: "none",
              }}
            />
            {renderLettersOnLine()}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 30,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              background: "rgba(0,0,0,0.8)",
              boxShadow: "5px 5px 3px #777777",
              borderRadius: 5,
              color: "#eee",
              fontSize: 20,
            }}
          >
            <span
              style={{
                width: 10,
                height: 12,
                borderRadius: "20%",
                background: "#00c853",
                display: "inline-block",
              }}
            />
            <span>{greenScore}</span>
            <span
              style={{
                width: 10,
                height: 12,
                borderRadius: "20%",
                background: "#ff1744",
                display: "inline-block",
                marginLeft: 4,
              }}
            />
            <span>{redScore}</span>
            {timerActive && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 14,
                  color: "#bbb",
                }}
              >
                {formatTime(elapsedMs)}
              </span>
            )}
          </div>

          <button
            onClick={handleShowHallOfFameFromButton}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = "2px 2px 1px #777777";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = "2px 2px 1px #777777";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #888",
              borderRadius: 5,
              padding: "4px 10px",
              fontSize: 18,
              cursor: "pointer",
              boxShadow: "5px 5px 3px #777777",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Zobacz Hall of Fame"
            aria-label="Zobacz Hall of Fame"
          >
            wyniki
          </button>

          <button
            onClick={handleBackClick}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = "2px 2px 1px #777777";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = "2px 2px 1px #777777";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #888",
              borderRadius: "10%",
              width: 39,
              height: 39,
              fontSize: 24,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "5px 5px 3px #777777",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Wroc"
            aria-label="Wroc"
          >
            <span
              style={{
                display: "inline-block",
                transform: "rotate(180deg) translateY(0px)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              &#8594;
            </span>
          </button>
        </div>

        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: 30,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            onClick={handlePrintHelper}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = "2px 2px 1px #777777";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = "2px 2px 1px #777777";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #888",
              borderRadius: "10%",
              width: 39,
              height: 39,
              fontSize: 20,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "5px 5px 3px #777777",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Drukuj podpowiedz"
            aria-label="Drukuj podpowiedz"
          >
            🖨️
          </button>

          <button
            onClick={() => setIsHelperVisible(true)}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = "2px 2px 1px #777777";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "translateY(3px)";
              e.currentTarget.style.boxShadow = "2px 2px 1px #777777";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow = "5px 5px 3px #777777";
            }}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #888",
              borderRadius: "10%",
              width: 39,
              height: 39,
              fontSize: 24,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "5px 5px 3px #777777",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "box-shadow 0.05s linear, transform 0.05s linear",
            }}
            title="Pokaz podpowiedz"
            aria-label="Pokaz podpowiedz"
          >
            ?
          </button>
        </div>

        {renderGhostLetter()}

        {isHelperVisible && (
          <div
            onClick={() => setIsHelperVisible(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: "2rem",
            }}
          >
            <img
              src="/assets/helper.png"
              alt="Podpowiedz"
              onClick={() => setIsHelperVisible(false)}
              style={{
                width: "80%",
                height: "auto",
                maxHeight: "90vh",
                cursor: "pointer",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
              }}
            />
          </div>
        )}
      </div>

      {showResultPopup && lastResult && (
        <div
          onClick={() => {
            if (!pendingHoF) {
              setShowResultPopup(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2500,
            padding: "1.5rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              color: "#fff",
              padding: "14px 18px 12px 18px",
              borderRadius: 6,
              maxWidth: 420,
              textAlign: "center",
              boxShadow: "0 10px 30px #000",
              fontSize: 16,
              lineHeight: 1.5,
            }}
          >
            <h3
              style={{
                margin: "0 0 6px 0",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Gratulacje
            </h3>
            <p style={{ margin: 0, marginBottom: 8 }}>
              Rozlozyles {lastResult.letters} czcionek
              w czasie {formatTime(lastResult.timeMs)},
              uzyskujac {lastResult.accuracy}% czcionek
              odlozonych na miejsce.
            </p>

            {pendingHoF && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  background: "#181818",
                  borderRadius: 5,
                  border: "1px solid #444",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    marginBottom: 6,
                    fontSize: 16,
                  }}
                >
                  Twoj wynik kwalifikuje sie do Hall of Fame (TOP 10).
                  Podaj swoje imie, aby zapisac wynik.
                </p>
                <input
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  placeholder="Twoje imie"
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    marginBottom: 6,
                    borderRadius: 4,
                    border: "1px solid #666",
                    background: "#000",
                    color: "#fff",
                    fontSize: 16,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleSaveHoF}
                  style={{
                    padding: "4px 10px",
                    background: "#222",
                    color: "#fff",
                    border: "1px solid #888",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  Zapisz wynik
                </button>
              </div>
            )}

            {!pendingHoF && (
              <button
                onClick={() => setShowResultPopup(false)}
                style={{
                  marginTop: 10,
                  padding: "4px 14px",
                  background: "#222",
                  color: "#fff",
                  border: "1px solid #888",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                OK
              </button>
            )}

            {hallOfFame.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  textAlign: "left",
                  fontSize: 16,
                  color: "#ccc",
                }}
              >
                <div
                  style={{
                    marginBottom: 2,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Hall of Fame
                </div>
                {hallOfFame.slice(0, 10).map((r, idx) => (
                  <div
                    key={
                      (r.name || "anon") +
                      getTimeMs(r) +
                      r.letters +
                      r.accuracy +
                      idx
                    }
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 4,
                    }}
                  >
                    <span>
                      {idx + 1}. {r.name || "anon"}
                    </span>
                    <span>
                      {r.letters} czcionek w {formatTime(getTimeMs(r))} / {r.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showHallOfFamePopup && (
        <div
          onClick={() => setShowHallOfFamePopup(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2600,
            padding: "1.5rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              color: "#fff",
              padding: "14px 18px 12px 18px",
              borderRadius: 6,
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 10px 30px #000",
              fontSize: 16,
              lineHeight: 1.5,
            }}
          >
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Hall of Fame
            </h3>

            {hallOfFame.length === 0 && (
              <p
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 16,
                }}
              >
                Brak zapisanych wynikow. Zagraj i zapisz swoj wynik.
              </p>
            )}

            {hallOfFame.length > 0 && (
              <div
                style={{
                  marginTop: 2,
                  textAlign: "left",
                  fontSize: 17,
                  color: "#ccc",
                }}
              >
                {hallOfFame.slice(0, 10).map((r, idx) => (
                  <div
                    key={
                      (r.name || "anon") +
                      getTimeMs(r) +
                      r.letters +
                      r.accuracy +
                      idx
                    }
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 4,
                    }}
                  >
                    <span>
                      {idx + 1}. {r.name || "anon"}
                    </span>
                    <span>
                      {r.letters} czcionek w {formatTime(getTimeMs(r))} / {r.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowHallOfFamePopup(false)}
              style={{
                marginTop: 10,
                padding: "4px 14px",
                background: "#222",
                color: "#fff",
                border: "1px solid #888",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <p
        style={{
          width: "100%",
          background: "#000",
          color: "#969498",
          textAlign: "center",
          fontSize: 13,
          letterSpacing: 0.2,
          fontFamily: "inherit",
          padding: "12px 0 8px 0",
          flexShrink: 0,
          marginTop: "auto",
          marginBottom: "0px",
          userSelect: "none",
        }}
      >
        <b>ZECER</b> - gra edukacyjna dla Muzeum Ksiażki Artystycznej w Łodzi
        &nbsp; &nbsp; &nbsp; produkcja:{" "}
        <a
          href="https://peterwolf.pl"
          target="_blank"
          rel="noopener"
          style={{
            color: "#fafafa",
            textDecoration: "none",
            transition: "color 0.45s",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#ff0000")}
          onMouseLeave={(e) => (e.target.style.color = "#969498")}
          onTouchStart={(e) => (e.target.style.color = "#ff0000")}
          onTouchEnd={(e) => (e.target.style.color = "#969498")}
        >
          peterwolf.pl
        </a>
      </p>
    </div>
  );
}