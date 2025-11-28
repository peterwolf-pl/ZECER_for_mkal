import React, { useState } from "react";
import LetterComposer from "./LetterComposer";
import LetterComposerPro from "./LetterComposerpro";
import PageComposer from "./PageComposer";
import PrintModule from "./PrintModule";
import Intro from "./Intro";
import AdminPanel from "./AdminPanel";
import LetterFieldGenerator from "./LetterFieldGenerator";

function App() {
  // Każdy ciąg znaków z wierszownika to tablica liter (obiektów), np. [{char, img, width}]
  const [lines, setLines] = useState([]);
  const [module, setModule] = useState("intro");
  const [kasztaVariant, setKasztaVariant] = useState("kaszta");
  const [pageSource, setPageSource] = useState("letter");
  const [proClampT, setProClampT] = useState(1); // pozycja zamka w LetterComposerPro

  const kasztaSettings = {
    kaszta: { image: "/assets/kaszta.png", pozSrc: "/poz.json" },
    szuflada: {
      image: "/assets/kaszta_szuflada.png",
      pozSrc: "/poz_szuflada.json",
    },
  };

  function handleSelect(variant) {
    setKasztaVariant(variant);
    setModule("letter");
  }

  function handleAdminLogin() {
    setModule("admin");
  }

  function handleCalibrate(variant) {
    setKasztaVariant(variant);
    setModule("calibrate");
  }
  // const [module, setModule] = useState("page");

  // Dodaj nową linię (ciąg liter) do PageComposer
  function addLine(line) {
    if (line && line.length > 0) {
      setLines((prev) => [...prev, line]);
    }
  }

  function clearLines() {
    setLines([]);
  }

  return (
    <>
      {module === "intro" && (
        <Intro onSelect={handleSelect} onAdmin={handleAdminLogin} />
      )}

      {module === "admin" && (
        <AdminPanel onCalibrate={handleCalibrate} />
      )}

      {module === "letter" && (
        <LetterComposer
          onMoveLineToPage={(line) => {
            addLine(line);
            setPageSource("letter");
            setModule("page");
          }}
          onBack={() => setModule("intro")}
          kasztaImage={kasztaSettings[kasztaVariant].image}
          pozSrc={kasztaSettings[kasztaVariant].pozSrc}
          onGoToPro={() => setModule("letterPro")}
        />
      )}

      {module === "letterPro" && (
        <LetterComposerPro
          onMoveLineToPage={(line) => {
            const processedLine =
              Array.isArray(line) ? [...line].reverse() : line;

            addLine(processedLine);
            setPageSource("letterPro");
            setModule("page");
          }}
          onBack={() => setModule("intro")}
          kasztaImage={kasztaSettings[kasztaVariant].image}
          pozSrc={kasztaSettings[kasztaVariant].pozSrc}
          initialClampT={proClampT}
          onClampChange={setProClampT}
          onGoToLetter={() => setModule("letter")}
        />
      )}

      {module === "page" && (
        <PageComposer
          lines={lines}
          onLinesChange={setLines}
          onBack={() =>
            setModule(pageSource === "letterPro" ? "letterPro" : "letter")
          }
          onClearLines={clearLines}
          onGoToPrint={() => setModule("print")}
        />
      )}

      {module === "print" && (
        <PrintModule
          lines={lines}
          onBack={() => setModule("page")}
        />
      )}

      {module === "calibrate" && (
        <LetterFieldGenerator
          kasztaImage={kasztaSettings[kasztaVariant].image}
          pozSrc={kasztaSettings[kasztaVariant].pozSrc}
          onBack={() => setModule("admin")}
        />
      )}
    </>
  );
}

export default App;