"use client";

import { useEffect } from "react";

export function SettingsLayoutClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sidebar = document.getElementById("settings-sidebar");
    const content = document.getElementById("settings-content");

    if (!sidebar || !content) return;

    const handleContentScroll = () => {
      sidebar.scrollTop = content.scrollTop;
    };

    content.addEventListener("scroll", handleContentScroll);
    return () => content.removeEventListener("scroll", handleContentScroll);
  }, []);

  return children;
}
