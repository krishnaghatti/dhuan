import "./StateMetaCard.scss";

export function StateMetaCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="state-meta-card">
      <div className="state-meta-card__value">{value}</div>
      <div className="state-meta-card__label">{label}</div>
    </div>
  );
}
