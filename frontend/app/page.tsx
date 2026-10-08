"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
};

export default function Home() {
  const [backendStatus, setBackendStatus] = useState("Checking...");

  useEffect(() => {
    async function checkBackend() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        setBackendStatus("API address is not configured");
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/health`);

        if (!response.ok) {
          throw new Error("The backend returned an error");
        }

        const data: HealthResponse = await response.json();
        setBackendStatus(data.status);
      } catch {
        setBackendStatus("Could not connect to the backend");
      }
    }

    void checkBackend();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">Lingo Path</h1>
        <p className="mt-4">Backend status: {backendStatus}</p>
      </section>
    </main>
  );
}