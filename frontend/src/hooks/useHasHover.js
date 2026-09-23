import { useState, useEffect } from "react";

export function useHasHover() {
  const [hasHover, setHasHover] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)").matches : true
  );

  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    function handler(e) { setHasHover(e.matches); }
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return hasHover;
}