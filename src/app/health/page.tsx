export default function HealthPage() {
  return (
    <section className="card">
      <h1>Frontend OK</h1>
      <p>This page exists so you can confirm routing works.</p>
      <p>
        For backend health, run the Go API and visit{" "}
        <code>http://localhost:8080/healthz</code>.
      </p>
    </section>
  );
}

