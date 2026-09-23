function AnalyticsCards({ summary }) {
  return (
    <section className="analytics-cards">

      <div className="analytics-card">
        <div className="analytics-icon">
          📊
        </div>

        <div>
          <span className="analytics-label">
            Total Reports
          </span>

          <strong>
            {summary?.total_reports ?? 0}
          </strong>
        </div>
      </div>


      <div className="analytics-card">
        <div className="analytics-icon">
          🌩️
        </div>

        <div>
          <span className="analytics-label">
            Total Events
          </span>

          <strong>
            {summary?.total_events ?? 0}
          </strong>
        </div>
      </div>


      <div className="analytics-card">
        <div className="analytics-icon">
          ✅
        </div>

        <div>
          <span className="analytics-label">
            Verified Reports
          </span>

          <strong>
            {summary?.verified_reports ?? 0}
          </strong>
        </div>
      </div>


      <div className="analytics-card">
        <div className="analytics-icon">
          ⚠️
        </div>

        <div>
          <span className="analytics-label">
            Duplicate Reports
          </span>

          <strong>
            {summary?.duplicate_reports ?? 0}
          </strong>
        </div>
      </div>

    </section>
  );
}


export default AnalyticsCards;