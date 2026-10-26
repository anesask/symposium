"use client";

import { useEffect, useState } from "react";

export interface ServerConfig {
  hasKey: boolean;
  ttsProvider: "browser" | "elevenlabs";
}

/** null while loading. In demo mode the key check is skipped. */
export function useServerConfig(demo: boolean): ServerConfig | null {
  const [config, setConfig] = useState<ServerConfig | null>(demo ? { hasKey: true, ttsProvider: "browser" } : null);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: ServerConfig) => setConfig(demo ? { ...c, hasKey: true } : c))
      .catch(() => setConfig({ hasKey: false, ttsProvider: "browser" }));
  }, [demo]);
  return config;
}
