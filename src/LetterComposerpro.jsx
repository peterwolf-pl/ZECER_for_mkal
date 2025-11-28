import React, { useRef, useState, useEffect } from "react";

const KASZTA_WIDTH = 2222;
const KASZTA_HEIGHT = 1521;
const SLOTS_COUNT = 20;

const LINE_OFFSET_RIGHT = 340;
const LINE_OFFSET_BOTTOM = 70;

// wierszownik i zamek - PRO
const WIERSZOWNIK_SRC = "/pro/wierszownikpro.png";
const ZAMEK_SRC = "/pro/zamek.png";

// geometria ruchu zamka w układzie współrzędnych wierszownika
// opis z Twojej specyfikacji
const CLAMP_RIGHT_OFFSET_MAX = 241;  // prawy bok zamka 241 px od prawej krawędzi wierszownika - pozycja skrajnie prawa
const CLAMP_BOTTOM_OFFSET_MAX = 13;  // dolna krawędź 13 px do góry od dołu wierszownika - pozycja skrajnie prawa

const CLAMP_RIGHT_OFFSET_MIN = 2441; // prawy bok zamka 2441 px od prawej krawędzi wierszownika - pozycja skrajnie lewa
const CLAMP_BOTTOM_OFFSET_MIN = 17;  // dolna krawędź 17 px do góry od dołu wierszownika - pozycja skrajnie lewa

function getImageSize(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = src;
  });
}

export default function LetterComposerPro({
  onMoveLineToPage,
  onBack,
  kasztaImage = "/assets/kaszta_szuflada.png",
  pozSrc = "/poz_szuflada.json",
  initialClampT = 1,
  onClampChange,
  onGoToLetter,
}) {
  const [letterFields, setLetterFields] = useState([]);
  const [slots, setSlots] = useState(Array(SLOTS_COUNT).fill(null));

  const [activeLetter, setActiveLetter] = useState(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0, visible: false });
  const [isDragging, setIsDragging] = useState(false);
  const [pickupAnim, setPickupAnim] = useState(false);

  const kasztaRef = useRef(null);
  const wierszownikRef = useRef(null);

  const [kasztaW, setKasztaW] = useState(KASZTA_WIDTH);
  const [wierszownikDims, setWierszownikDims] = useState({
    width: 1,
    height: 1,
  });

  const [isHelperVisible, setIsHelperVisible] = useState(false);

  // zamek - wymiary i pozycja parametryczna 0..1
  const [clampDims, setClampDims] = useState({ width: 1, height: 1 });
  const [clampT, setClampT] = useState(
    typeof initialClampT === "number" ? initialClampT : 1
  ); // 1 - skrajna prawa, 0 - skrajna lewa
  const [isClampDragging, setIsClampDragging] = useState(false);

    useEffect(() => {
    if (typeof onClampChange === "function") {
      onClampChange(clampT);
    }
  }, [clampT, onClampChange]);

  const handlePrintHelper = () => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      console.warn("[LetterComposerPro] Nie udalo sie otworzyc okna drukowania.");
      return;
    }

    const helperSrc = "/assets/helper.png";

    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>Drukuj podpowiedz</title>
    <style>
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; height: 100%; }
      body { display: flex; align-items: center; justify-content: center; background: #fff; }
      img { width: 100%; height: 100%; object-fit: contain; }
    </style>
  </head>
  <body>
    <img src="${helperSrc}" alt="Podpowiedz" id="helper-image" />
    <script>
      function printAndClose() {
        setTimeout(function() { window.focus(); window.print(); }, 150);
      }
      const img = document.getElementById('helper-image');
      if (img.complete) {
        printAndClose();
      } else {
        img.addEventListener('load', printAndClose);
      }
      window.addEventListener('afterprint', function() { window.close(); });
    </scr` + `ipt>
  </body>
</html>`);

    printWindow.document.close();
  };

  // wczytanie wierszownika pro
  useEffect(() => {
    const img = new window.Image();
    img.onload = () =>
      setWierszownikDims({ width: img.width, height: img.height });
    img.src = WIERSZOWNIK_SRC;
  }, []);

  // wczytanie zamka pro
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setClampDims({ width: img.width, height: img.height });
    img.src = ZAMEK_SRC;
  }, []);

  // blokada scrolla
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  // responsywna szerokosc kaszty
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

  // pobranie pozycji liter z JSON
  useEffect(() => {
    const base =
      typeof window !== "undefined" ? window.location.href : "http://localhost";
    let resolvedPoz = pozSrc;
    try {
      resolvedPoz = new URL(pozSrc, base).href;
    } catch (urlError) {
      console.warn(
        "[LetterComposerPro] Nie udalo sie zbudowac pelnej sciezki do pliku pozycji:",
        urlError
      );
    }

    console.info(
      `[LetterComposerPro] Pobieranie pol liter z ${resolvedPoz}`
    );

    fetch(pozSrc)
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Nie udalo sie pobrac pol (${res.status}) z ${resolvedPoz}`
          );
        }
        return res.json();
      })
      .then((data) => {
        setLetterFields(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("[LetterComposerPro] Blad podczas pobierania pol:", error);
        setLetterFields([]);
      });
  }, [pozSrc]);

  // start drag z kaszty
  const handleFieldDragStart = async (field, e) => {
    e.preventDefault();
    const { width, height } = await getImageSize(field.img);
    setActiveLetter({ ...field, width, height });
    setPickupAnim(true);
    setTimeout(() => setPickupAnim(false), 300);

    let x = 0;
    let y = 0;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else if (e.clientX && e.clientY) {
      x = e.clientX;
      y = e.clientY;
    }

    setGhostPos({ x, y, visible: true });
    setIsDragging(true);
  };

  // globalny drag dla czcionek
  useEffect(() => {
    if (!isDragging) return;

    const moveGhost = (e) => {
      setGhostPos({
        x: e.clientX,
        y: e.clientY,
        visible: true,
      });
    };

    const moveGhostTouch = (e) => {
      if (e.touches && e.touches[0]) {
        setGhostPos({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          visible: true,
        });
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

      if (wierszownikRef.current) {
        const rect = wierszownikRef.current.getBoundingClientRect();
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          placeLetter();
        } else {
          setActiveLetter(null);
          setGhostPos({ x: 0, y: 0, visible: false });
        }
      }

      setIsDragging(false);
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
  }, [isDragging, slots, activeLetter]);

  // przesuwanie zamka po linii
  useEffect(() => {
    if (!isClampDragging) return;

    const handleMove = (e) => {
      if (!wierszownikRef.current) return;
      const rect = wierszownikRef.current.getBoundingClientRect();

      let clientX = 0;
      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
      } else if (e.clientX) {
        clientX = e.clientX;
      } else {
        return;
      }

      const wScale =
        rect.width / (wierszownikDims.width || 1);

      const xInside = (clientX - rect.left) / wScale; // w układzie wierszownika

      const wWidth = wierszownikDims.width || 1;

      const xRightMin = wWidth - CLAMP_RIGHT_OFFSET_MIN;
      const xRightMax = wWidth - CLAMP_RIGHT_OFFSET_MAX;
      const denom =
        xRightMax - xRightMin !== 0 ? xRightMax - xRightMin : 1;

      let t = (xInside - xRightMin) / denom;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      setClampT(t);
    };

    const handleUp = () => {
      setIsClampDragging(false);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchend", handleUp, { passive: false });

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchend", handleUp);
    };
  }, [isClampDragging, wierszownikDims]);

  // umieszczenie litery w slotach
  function placeLetter() {
    if (!activeLetter) return;

    let idx = slots.findIndex((s) => s === null);
    if (idx === -1) idx = slots.length - 1;

    const updatedSlots = [...slots];
    updatedSlots[idx] = {
      ...activeLetter,
      id: Math.random().toString(36),
    };

    setSlots(updatedSlots);
    setActiveLetter(null);
    setGhostPos({ x: 0, y: 0, visible: false });
    setIsDragging(false);
  }

  // klik w kasztę - kasuje ghosta
  function handleKasztaBackgroundClick() {
    setActiveLetter(null);
    setGhostPos({ x: 0, y: 0, visible: false });
    setIsDragging(false);
  }

  const removeLetterFromSlot = (i) => {
    const updated = [...slots];
    updated[i] = null;
    setSlots(updated);
  };

  const handleBack = () => {
    setSlots(Array(SLOTS_COUNT).fill(null));
    setActiveLetter(null);
    setGhostPos({ x: 0, y: 0, visible: false });
    setIsDragging(false);
    if (typeof onBack === "function") {
      onBack();
    }
  };

  const handleGoToLetter = () => {
  setSlots(Array(SLOTS_COUNT).fill(null));
  setActiveLetter(null);
  setGhostPos({ x: 0, y: 0, visible: false });
  setIsDragging(false);
  if (typeof onGoToLetter === "function") {
    onGoToLetter();
  }
};

  const kasztaScale = kasztaW / KASZTA_WIDTH;
  const kasztaH = kasztaW * (KASZTA_HEIGHT / KASZTA_WIDTH);

  const lineW = kasztaW * 0.8;
  const wierszScale = lineW / wierszownikDims.width;
  const lineH = wierszownikDims.height * wierszScale;
  const letterScale = wierszScale;
  const offsetRight = LINE_OFFSET_RIGHT * wierszScale;
  const baseline = lineH - LINE_OFFSET_BOTTOM * wierszScale;

  // obliczenie pozycji zamka z parametru t
  const zamekGeometry = (() => {
    const wWidth = wierszownikDims.width || 1;
    const wHeight = wierszownikDims.height || 1;

    const rightOffset =
      CLAMP_RIGHT_OFFSET_MAX * clampT +
      CLAMP_RIGHT_OFFSET_MIN * (1 - clampT);

    const bottomOffset =
      CLAMP_BOTTOM_OFFSET_MAX * clampT +
      CLAMP_BOTTOM_OFFSET_MIN * (1 - clampT);

    const xRightBase = wWidth - rightOffset;
    const yBottomBase = wHeight - bottomOffset;

    const leftBase = xRightBase - clampDims.width;
    const topBase = yBottomBase - clampDims.height;

    const left = leftBase * wierszScale;
    const top = topBase * wierszScale;

    const clampWidthPx = clampDims.width * wierszScale;
    const rightEdgeX = left + clampWidthPx; // w układzie wierszownika (piksele w komponencie)

    return {
      left,
      top,
      width: clampWidthPx,
      height: clampDims.height * wierszScale,
      rightEdgeX,
    };
  })();

  // litery do góry nogami od lewej do prawej - start przy prawej krawędzi zamka
  function renderLettersOnLine() {
    const startX = zamekGeometry.rightEdgeX;

    const occupied = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot) {
        occupied.push({ slot, index: i });
      }
    }

    let currentLeft = startX;
    const nodes = [];

    for (let k = 0; k < occupied.length; k++) {
      const { slot, index } = occupied[k];
      const w = slot.width * letterScale;
      const h = (slot.height || 96) * letterScale;

      const left = currentLeft;
      const top = baseline - h;

      nodes.push(
        <div
          key={slot.id}
          style={{
            position: "absolute",
            left,
            top,
            width: w,
            height: h,
            zIndex: 3,
            cursor: "pointer",
            transformOrigin: "center center",
          }}
          onClick={() => removeLetterFromSlot(index)}
          title="Kliknij, aby usunac litere z wiersza"
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: "rotate(180deg)",
            }}
          >
            <img
              src={slot.img}
              alt={slot.char}
              width={w}
              height={h}
              draggable={false}
              style={{ display: "block" }}
            />
          </div>
        </div>
      );

      // kolejna litera idzie po PRAWEJ stronie poprzedniej
      currentLeft += w;
    }

    return nodes;
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
            ghostPos.x - (activeLetter.width * letterScale) / 2,
          top:
            ghostPos.y -
            ((activeLetter.height || 96) * letterScale) / 2,
          width: activeLetter.width * letterScale,
          height: (activeLetter.height || 96) * letterScale,
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
        {/* Kaszta */}
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
            <button
              key={
                field.char +
                field.x1 +
                field.y1 +
                field.x2 +
                field.y2
              }
              onMouseDown={(e) => handleFieldDragStart(field, e)}
              onTouchStart={(e) => handleFieldDragStart(field, e)}
              aria-label="Wybierz czcionke"
              style={{
                position: "absolute",
                left:
                  Math.min(field.x1, field.x2) * kasztaScale,
                top:
                  Math.min(field.y1, field.y2) * kasztaScale,
                width:
                  Math.abs(field.x2 - field.x1) * kasztaScale,
                height:
                  Math.abs(field.y2 - field.y1) * kasztaScale,
                border: "0px solid #2563eb",
                background: "rgba(96,165,250,0.0)",
                borderRadius: "10px",
                cursor: "pointer",
                zIndex: 2,
                boxSizing: "border-box",
                outline: "none",
                userSelect: "none",
                touchAction: "none",
              }}
            />
          ))}
        </div>

        {/* Wierszownik PRO z zamkiem PRO */}
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
              alt="Wierszownik PRO"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                pointerEvents: "none",
              }}
            />

            {/* zamek PRO przesuwany po linii */}
            <img
              src={ZAMEK_SRC}
              alt="Zamek PRO"
              style={{
                position: "absolute",
                left: zamekGeometry.left,
                top: zamekGeometry.top,
                width: zamekGeometry.width,
                height: zamekGeometry.height,
                cursor: "ew-resize",
                zIndex: 4,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsClampDragging(true);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsClampDragging(true);
              }}
            />

            {renderLettersOnLine()}
          </div>
        </div>

        {/* panel lewy */}
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 30,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            onClick={handleBack}
            onMouseDown={(e) => {
              e.currentTarget.style.transform =
                "translateY(3px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 1px #777777";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform =
                "translateY(3px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 1px #777777";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
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
            title="Wroc do wyboru kaszty"
            aria-label="Wroc do wyboru kaszty"
          >
            <span
              style={{
                display: "inline-block",
                transform: "translateY(0px)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              &#8592;
            </span>
          </button>
        </div>

        {/* panel prawy */}
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
    onClick={handleGoToLetter}
    onMouseDown={(e) => {
      e.currentTarget.style.transform =
        "translateY(3px)";
      e.currentTarget.style.boxShadow =
        "2px 2px 1px #777777";
    }}
    onMouseUp={(e) => {
      e.currentTarget.style.transform =
        "translateY(0px)";
      e.currentTarget.style.boxShadow =
        "5px 5px 3px #777777";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform =
        "translateY(0px)";
      e.currentTarget.style.boxShadow =
        "5px 5px 3px #777777";
    }}
    onTouchStart={(e) => {
      e.currentTarget.style.transform =
        "translateY(3px)";
      e.currentTarget.style.boxShadow =
        "2px 2px 1px #777777";
    }}
    onTouchEnd={(e) => {
      e.currentTarget.style.transform =
        "translateY(0px)";
      e.currentTarget.style.boxShadow =
        "5px 5px 3px #777777";
    }}
    style={{
      background: "#008000",
      color: "#fff",
      border: "2px solid #888",
      borderRadius: "10%",
      width: 39,
      height: 39,
      //fontSize: 20,
      //fontWeight: "bold",
      cursor: "pointer",
      boxShadow: "5px 5px 3px #777777",
      outline: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    title="Wroc do zwyklego wierszownika"
    aria-label="Wroc do zwyklego wierszownika"
  >
    <img
      src="/pro/zamek-ico.png"
      alt="Standard"
      style={{
        width: "80%",
        height: "80%",
        objectFit: "contain",
        pointerEvents: "none",
      }}
    />
  </button>
          <button
            onClick={handlePrintHelper}
            onMouseDown={(e) => {
              e.currentTarget.style.transform =
                "translateY(3px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 1px #777777";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform =
                "translateY(3px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 1px #777777";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
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
              e.currentTarget.style.transform =
                "translateY(3px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 1px #777777";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform =
                "translateY(3px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 1px #777777";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
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
            title="Pokaz podpowiedz"
            aria-label="Pokaz podpowiedz"
          >
            ?
          </button>

          <button
            onClick={() => {
              const line = slots.filter(Boolean);
              if (typeof onMoveLineToPage === "function") {
                onMoveLineToPage(line);
                setSlots(Array(SLOTS_COUNT).fill(null));
              }
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform =
                "translateY(3px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 1px #777777";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform =
                "translateY(3px)";
              e.currentTarget.style.boxShadow =
                "2px 2px 1px #777777";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "5px 5px 3px #777777";
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
            title="Przenies linie na strone"
            aria-label="Przenies linie na strone"
          >
            <span
              style={{
                display: "inline-block",
                transform: "translateY(0px)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              &#8594;
            </span>
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
        <b>ZECER PRO</b> - gra edukacyjna dla
        <a
          href="https://mkalodz.pl"
          target="_blank"
          rel="noopener"
          style={{
            color: "#fafafa",
            textDecoration: "none",
            transition: "color 0.45s",
            marginLeft: 6,
          }}
          onMouseEnter={(e) => (e.target.style.color = "#ff0000")}
          onMouseLeave={(e) => (e.target.style.color = "#969498")}
          onTouchStart={(e) => (e.target.style.color = "#ff0000")}
          onTouchEnd={(e) => (e.target.style.color = "#969498")}
        >
          Muzeum Ksiazki Artystycznej w Lodzi
        </a>
        &nbsp; | &nbsp; produkcja:
        <a
          href="https://peterwolf.pl"
          target="_blank"
          rel="noopener"
          style={{
            color: "#fafafa",
            textDecoration: "none",
            transition: "color 0.45s",
            marginLeft: 6,
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