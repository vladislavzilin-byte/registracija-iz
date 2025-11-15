import { useState, useEffect } from "react";
import { getCurrentUser } from "../lib/storage";
import { useI18n } from "../lib/i18n";

export default function Calendar() {
  const { t } = useI18n();

  const [user, setUser] = useState(getCurrentUser());
  const [showPrices, setShowPrices] = useState(true);
  const [showPriceList, setShowPriceList] = useState(false);

  /* ============================
     ПРОВЕРКА ВХОДА В АККАУНТ
  ============================ */
  useEffect(() => {
    const interval = setInterval(() => {
      const u = getCurrentUser();
      if (JSON.stringify(u) !== JSON.stringify(user)) setUser(u);
    }, 1500);

    return () => clearInterval(interval);
  }, [user]);

  /* Если пользователь не вошёл → только Auth */
  if (!user) {
    return (
      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <h2 style={{ color: "white", opacity: 0.7 }}>
          {t("choose_date")}
        </h2>
      </div>
    );
  }

  /* ============================
       ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
  ============================ */
  const initials = user.name
    ? user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div style={{ width: "100%", marginTop: "20px" }}>

      {/* ============================
            БЛОК ПРОФИЛЯ
      ============================ */}
      <div
        style={{
          background: "rgba(20,10,40,0.6)",
          border: "1px solid rgba(150,80,255,0.35)",
          borderRadius: "16px",
          padding: "22px 26px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background:
                "linear-gradient(180deg, rgba(46,27,61,1), rgba(36,17,50,1))",
              border: "1px solid rgba(150,90,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            {initials}
          </div>

          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {user.name}
            </div>
            {user.phone && (
              <div style={{ opacity: 0.8 }}>{user.phone}</div>
            )}
            {user.email && (
              <div style={{ opacity: 0.8 }}>{user.email}</div>
            )}
          </div>
        </div>
      </div>

      {/* ============================
              KAINAS (ЦЕНЫ)
      ============================ */}
      <h2
        style={{
          color: "white",
          fontSize: "22px",
          fontWeight: "600",
          marginBottom: "10px",
        }}
      >
        Kainas
      </h2>

      {/* Выпадашка */}
      <div
        onClick={() => setShowPriceList(!showPriceList)}
        style={{
          background: "rgb(20,15,35)",
          border: "1px solid rgba(150, 80, 255, 0.35)",
          padding: "16px 18px",
          borderRadius: "10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            color: "#b37bff",
            fontSize: "20px",
            transform: showPriceList ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.25s",
          }}
        >
          ▾
        </span>

        <span style={{ color: "white", fontSize: "16px" }}>
          Žiūrėti kainas
        </span>
      </div>

      {/* Список цен */}
      {showPriceList && (
        <div
          style={{
            background: "rgba(20,10,40,0.8)",
            border: "1px solid rgba(160,80,255,0.3)",
            borderRadius: "14px",
            padding: "22px 26px",
            lineHeight: "1.55",
            fontSize: "17px",
            color: "white",
            marginBottom: "26px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <b>80–130 €</b><br />
            Šukuosenos kaina<br />
            <span style={{ opacity: 0.75 }}>
              Priklauso nuo darbo apimties
            </span>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <b>25 €</b><br />
            Konsultacija<br />
            <span style={{ opacity: 0.75 }}>
              Užtrunkame nuo 30 min. iki valandos
            </span>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <b>50 € užstatas</b><br />
            <b>100 €</b><br />
            Plaukų Tresų nuoma<br />
            <span style={{ opacity: 0.75 }}>
              Grąžinti reikia per 3/4 d.
              Grąžinate plaukus, grąžinu užstatą
            </span>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <b>Iki 20 €</b><br />
            Papuošalų nuoma
          </div>

          <div>
            <b>130 €</b><br />
            Atvykimas Klaipėdoje<br />
            <span style={{ opacity: 0.75 }}>
              Daiktų kraustymai, važinėjimai – per tą laiką galiu priimti kitą klientę.
            </span>
          </div>
        </div>
      )}

      {/* здесь идёт остальной твой календарь */}
    </div>
  );
}
