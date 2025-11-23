import { useI18n } from "../lib/i18n";
import { useEffect, useState } from "react";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [hidden, setHidden] = useState(false);

  // === логика появления / скрытия на мобильных ===
  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const isMobile = window.innerWidth < 768;

      if (!isMobile) {
        setHidden(false);
        return;
      }

      if (currentY > lastY + 10) setHidden(true);
      else if (currentY < lastY - 10) setHidden(false);

      lastY = currentY;
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const btn = (code) => ({
    padding: "8px 12px",
    borderRadius: 12,
    border: lang === code
      ? "1.5px solid rgba(168,85,247,0.9)"
      : "1px solid rgba(168,85,247,0.4)",
    background: lang === code
      ? "linear-gradient(180deg, rgba(94,0,165,1), rgba(54,0,95,1))"
      : "rgba(17,0,40,0.45)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: lang === code
      ? "0 0 18px rgba(168,85,247,0.55)"
      : "0 0 0 rgba(0,0,0,0)",
    transition: "0.25s",
  });

  return (
    <>
      <style>{`
        /* === LANG FOOTER (mobile only) === */
        @media (max-width: 768px) {
          .lang-footer {
            position: fixed;
            bottom: 14px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            gap: 12px;
            z-index: 999;
            transition: opacity 0.35s ease, transform 0.35s ease;
            opacity: 1;
            transform: translateY(0);
          }
          .lang-footer.hidden {
            opacity: 0;
            transform: translateY(120%);
          }
        }
        /* desktop — как есть */
        @media (min-width: 768px) {
          .lang-footer {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 12px;
          }
        }
      `}</style>

      <div className={`lang-footer ${hidden ? "hidden" : ""}`}>
        <button style={btn("LT")} onClick={() => setLang("LT")}>LT</button>
        <button style={btn("RU")} onClick={() => setLang("RU")}>RU</button>
        <button style={btn("GB")} onClick={() => setLang("GB")}>GB</button>
      </div>
    </>
  );
}
