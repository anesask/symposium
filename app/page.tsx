"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SessionProvider } from "@/lib/store/session";
import { TableView } from "@/components/TableView";

function Inner() {
  const query = useSearchParams().get("demo") === "1";
  // "#demo" starts the scripted demo without a page load (used to record the demo video in one take).
  const [hashDemo, setHashDemo] = useState(false);
  useEffect(() => {
    const on = () => setHashDemo(location.hash === "#demo");
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const demo = query || hashDemo;
  return (
    <SessionProvider key={demo ? "demo" : "live"} demo={demo}>
      <TableView />
    </SessionProvider>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
