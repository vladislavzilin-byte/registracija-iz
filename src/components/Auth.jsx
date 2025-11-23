import { useI18n } from "../lib/i18n";
import { useEffect, useState } from "react";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [hidden, setHidden] = useState(false);

  // скрытие на скролле (только мобилка)
  useEffect(() => {
    let last = window.scrollY;

    const scroll = () => {
      if (window.innerWidth > 768) {
        setHidden(false);
        return;
      }

      if (window.scrollY > last + 10) setHidden(true);
      if (window.scrollY < last - 10) setHidden(false);

      last = window.scrollY;
    };

    window.addEventListener("scroll", scroll);
    return () => window.removeEventListener("scroll", scroll);
  }, []);

  const button = (code) => ({
    padding: "4px 10px",            // ← в 2 РАЗА МЕНЬШЕ
    borderRadius: 10,
    fontSize: "12px",               // ← в 2 РАЗА МЕНЬШЕ
    border: lang === code
      ? "1.5px solid rgba(168,85,247,0.9)"
      : "1px solid rgba(168,85,247,0.35)",
    background: lang === code
      ? "rgba(140,60,250,0.65)"
      : "rgba(35,0,75,0.55)",
    color: "#fff",
    cursor: "pointer",
    transition: ".25s",
    boxShadow: lang === code
      ? "0 0 12px rgba(168,85,247,0.55)"
      : "none"
  });

  return (
    <>
      <style>{`
        /* PC версия — обычный вид */
        @media (min-width: 768px) {
          .lang-bar {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 10px;
          }
        }

        /* МОБИЛЬНАЯ */
        @media (max-width: 768px) {
          .lang-bar {
            position: fixed;
            bottom: 12px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            gap: 8px;
            z-index: 999;
            transform: translateY(0);
            opacity: 1;
            transition: .35s ease;
          }
          .lang-bar.hidden {
            transform: translateY(150%);
            opacity: 0;
          }
        }
      `}</style>

      <div className={`lang-bar ${hidden ? "hidden" : ""}`}>
        <button style={button("LT")} onClick={() => setLang("LT")}>LT</button>
        <button style={button("RU")} onClick={() => setLang("RU")}>RU</button>
        <button style={button("GB")} onClick={() => setLang("GB")}>GB</button>
      </div>
    </>
  );
}
