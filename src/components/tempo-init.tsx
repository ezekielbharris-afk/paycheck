"use client";


import { useEffect } from "react";

export function TempoInit() {
  useEffect(() => {
    // Tempo runs inside an iframe; avoid relying on NEXT_PUBLIC_TEMPO.
    // Provide a safe no-op init hook to prevent runtime script errors in the canvas.
    if (typeof window === "undefined") return;

    // If Tempo injects anything on the window, we can safely touch it here.
    // (Keeping this intentionally defensive.)
    void (window as unknown);
  }, []);

  return null;
}