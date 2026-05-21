import { useEffect, useState } from "react";
import { dashboardService, type NewAccountStat } from "../../services/dashboardService";
import "../../styles/admin.css";

function SectionCard({ title = "New Accounts" }: { title?: string }) {
  const [accounts, setAccounts] = useState<NewAccountStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNewAccounts() {
      try {
        setLoading(true);
        setError(null);

        const rows = await dashboardService.getNewAccounts();

        if (!isMounted) return;

        setAccounts(Array.isArray(rows) ? rows.slice(0, 5) : []);
      } catch (err) {
        console.error("Error loading new accounts:", err);
        if (isMounted) {
          setError("No se pudieron cargar las cuentas nuevas.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadNewAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="admin-section-card">
      <header className="admin-section-card-header">
        <h3 className="admin-section-card-title">{title}</h3>
      </header>

      {loading ? (
        <p className="admin-card-message admin-card-message-compact">Cargando cuentas nuevas...</p>
      ) : error ? (
        <p className="admin-card-message admin-card-message-compact admin-card-message-error">
          {error}
        </p>
      ) : accounts.length === 0 ? (
        <p className="admin-card-message admin-card-message-compact">No hay cuentas nuevas.</p>
      ) : (
        <div className="admin-section-card-list">
          {accounts.map((account) => (
            <article key={`${account.username}-${account.joined_ago}`} className="admin-section-card-item">
              <p className="admin-section-card-text">
                <span className="admin-section-card-username">@{account.username}</span> joined the community
              </p>
              <span className="admin-section-card-time">{account.joined_ago}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default SectionCard;
