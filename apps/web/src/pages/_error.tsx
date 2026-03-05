import type { NextPageContext } from "next";

interface LegacyErrorPageProps {
  statusCode?: number;
}

function LegacyErrorPage({ statusCode }: LegacyErrorPageProps) {
  const code = statusCode ?? 500;
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0A0D12",
        color: "#F5F7FA",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p style={{ opacity: 0.8 }}>Error code: {code}</p>
      </div>
    </main>
  );
}

LegacyErrorPage.getInitialProps = ({ res, err }: NextPageContext): LegacyErrorPageProps => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default LegacyErrorPage;
