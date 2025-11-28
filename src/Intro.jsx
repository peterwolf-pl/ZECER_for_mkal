import React from "react";

export default function Intro({ onSelect, onAdmin }) {
  function handleAdminClick() {
    const pwd = window.prompt("Podaj hasło:");
    if (pwd === "mask") {
      if (onAdmin) onAdmin();
    } else if (pwd !== null) {
      window.alert("Nieprawidłowe hasło");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        margin: 0,
        padding: "40px 16px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        backgroundColor: "#000",
        backgroundImage: "url(/assets/bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Przyciemnienie dla czytelności tekstu */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.8), rgba(0,0,0,0.1))",
          pointerEvents: "none",
        }}
      />

      {/* Admin button */}
      <button
        onClick={handleAdminClick}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "#00000088",
          border: "1px solid #ffffff88",
          color: "#fff",
          cursor: "pointer",
          fontSize: 16,
          padding: "4px 8px",
          zIndex: 2,
        }}
      >
        adm
      </button>

      {/* Główny blok */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontFamily: "GrohmanGrotesk-Classic",
            fontSize: "clamp(72px, 14vw, 200px)",
            color: "#fff",
            margin: 0,
            lineHeight: 1,

          }}
        >
          ZECER
        </h1>
;
        <p
          style={{
            fontFamily: "GrohmanGrotesk-Classic",
            fontSize: "1.66rem",
            color: "#fff",
            margin: "-60px 0 12px 0",
            textAlign: "right",
            lineHeight: 0.1,
          }}
        >
          {" "}
          <a
            href="https://peterwolf.pl"
            target="_blank"
            rel="noopener"
            style={{
              color: "#969498",
              textDecoration: "none",
              transition: "color 0.45s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#ff0000")}
            onMouseLeave={(e) => (e.target.style.color = "#969498")}
            onTouchStart={(e) => (e.target.style.color = "#ff0000")}
            onTouchEnd={(e) => (e.target.style.color = "#fff")}
          >.peterwolf.pl
          </a>
        </p>
           <h2
          style={{
            fontFamily: "GrohmanGrotesk-Classic",
            fontSize: "clamp(14px, 2.2vw, 20px)",
            color: "#999",
            margin: "66px 0 16px 0",
          }}
        >
          aplikacja/gra edukacyjna prezentująca technike składu druarskiego metodą Gutenberga 
        </h2>

        <h2
          style={{
            fontFamily: "GrohmanGrotesk-Classic",
            fontSize: "clamp(22px, 3.2vw, 46px)",
            color: "#ff0000",
            margin: "0 0 0 0",
          }}
        >
          MUZEUM KSIĄŻKI ARTYSTYCZNEJ W ŁODZI
        </h2>

        <h3
          style={{
            fontFamily: "GrohmanGrotesk-Classic",
            fontSize: "clamp(14px, 2.2vw, 20px)",
            color: "#ffffff",
            margin: "50px 0 56px 0",
          }}
        >
          WYBIERZ KASZTĘ:
        </h3>
 <div
          style={{
            display: "inline-flex",
            justifyContent: "center",
            gap: "3rem",
          }}
        >



<div
          style={{
            display: "table-column",
            justifyContent: "center",
            gap: "0rem",
            marginTop: "0.1rem",
          }}
        >
          <img
            src="/assets/kaszta_szuflada.png"
            alt="Kaszta szuflada"
            style={{
              width: "min(300px, 80vw)",
              cursor: "pointer",
              boxShadow: "10px 8px 24px #0008",
            }}
            onClick={() => onSelect("szuflada")}
          />
             <h4
          style={{
            fontFamily: "GrohmanGrotesk-Classic",
            fontSize: "1.25rem",
            color: "#ccc",
            marginTop: "10px",
            padding: "0px 10px",
            cursor: "pointer",
            background: "#33333388",
            boxShadow: "10px 8px 24px #0008",
          }}
 onMouseEnter={(e) => (e.target.style.color = "#ff0000")}
            onMouseLeave={(e) => (e.target.style.color = "#ccc")}
            onTouchStart={(e) => (e.target.style.color = "#ff0000")}
            onTouchEnd={(e) => (e.target.style.color = "#fff")}
          onClick={() => onSelect("szuflada")}
        >Czcionka Brygada 1918 - 48 didot
        </h4>
              <h4
          style={{
            fontFamily: "GrohmanGrotesk-Classic",
            fontSize: "1.25rem",
            color: "#ccc",
            marginTop: "-20px",
            padding: "0px 10px",
           //* cursor: "pointer", */
            background: "#33333388",
            boxShadow: "10px 8px 24px #0008",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#ccc")}
            onMouseLeave={(e) => (e.target.style.color = "#ccc")}
            onTouchStart={(e) => (e.target.style.color = "#ccc")}
            onTouchEnd={(e) => (e.target.style.color = "#fff")}
         /* onClick={() => onSelect("szuflada")} */
        >Czcionka Brygada 1918 - 16 didot
        </h4>

        </div>

     



        <div
          style={{
            display: "table-column",
            justifyContent: "center",
            gap: "1.1rem",
            marginTop: "0.1rem",
          }}
        >
          <img
            src="/assets/kaszta_szuflada_nd.png"
            alt="Kaszta szuflada"
            style={{
              width: "min(300px, 80vw)",
              cursor: "pointer",
              boxShadow: "10px 8px 24px #0008",
            }}
          /*  onClick={() => onSelect("szuflada")} */
          />
             <h4
          style={{
            fontFamily: "GrohmanGrotesk-Classic",
            fontSize: "1.25rem",
            color: "#ccc",
            marginTop: "10px",
            padding: "0px 10px",
            cursor: "pointer",
            background: "#33333388",
            boxShadow: "10px 8px 24px #0008",
          }}
           onMouseEnter={(e) => (e.target.style.color = "#ff0000")}
            onMouseLeave={(e) => (e.target.style.color = "#ccc")}
            onTouchStart={(e) => (e.target.style.color = "#ff0000")}
            onTouchEnd={(e) => (e.target.style.color = "#fff")}
         /* onClick={() => onSelect("szuflada")} */
        >Czcionka Grohman Grotesk - 48 didot
        </h4>

        </div>

</div>
   

     {/* STOPKA */}
      <p
        style={{
          width: "100%",
          background: "#33333388",
          color: "#969498",
          textAlign: "center",
          fontSize: 16,
          letterSpacing: 0.2,
          fontFamily: "inherit",
          padding: "12px 0 12px 0",
          flexShrink: 0,
          marginTop: "100px",
          marginBottom: "0px",
          userSelect: "none",
          
        }}
      >
        <b>produkcja:</b> &nbsp; 
        <a
           href="https://peterwolf.pl"
          target="_blank"
          rel="noopener"
          style={{ color: "#eee", textDecoration: "none", transition: "color 0.45s" }}
          onMouseEnter={(e) => (e.target.style.color = "#ff0000")}
          onMouseLeave={(e) => (e.target.style.color = "#eee")}
          onTouchStart={(e) => (e.target.style.color = "#ff0000")}
          onTouchEnd={(e) => (e.target.style.color = "#eee")}
        >
          Piotr Wilkocki
        </a>{" "}
        &nbsp;  &nbsp;  &nbsp; 
        <b>współpraca:</b> &nbsp; 
        
        <mark
          style={{ color: "#eee",
            display: "inline-row",
            background: "#00000000",
          }}
        >
        Kacper Zagdan, Kasia Reszka
      </mark>
      </p>

      </div>
    </div>
  );
}