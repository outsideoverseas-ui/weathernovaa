import { useEffect, useState } from "react";

import AnalyticsCards from "./components/AnalyticsCards";
import EventChart from "./components/EventChart";
import EventsList from "./components/EventsList";
import ForecastChart from "./components/ForecastChart";
import SeverityChart from "./components/SeverityChart";
import StateChart from "./components/StateChart";

import "./App.css";


const API_BASE_URL =
  "http://127.0.0.1:8000";


function App() {
  const [city, setCity] =
    useState("");

  const [weather, setWeather] =
    useState(null);

  const [analytics, setAnalytics] =
    useState(null);

  const [reports, setReports] =
    useState([]);

  const [events, setEvents] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [searchHistory, setSearchHistory] =
    useState([]);

  const [lastUpdated, setLastUpdated] =
    useState(null);


  async function loadAnalytics() {
    const response =
      await fetch(
        `${API_BASE_URL}/analytics/summary`
      );

    if (!response.ok) {
      throw new Error(
        "Unable to load analytics."
      );
    }

    const data =
      await response.json();

    setAnalytics(data);
  }


  async function loadReports() {
    const response =
      await fetch(
        `${API_BASE_URL}/reports/`
      );

    if (!response.ok) {
      throw new Error(
        "Unable to load reports."
      );
    }

    const data =
      await response.json();

    setReports(data);
  }


  async function loadEvents() {
    const response =
      await fetch(
        `${API_BASE_URL}/events/`
      );

    if (!response.ok) {
      throw new Error(
        "Unable to load events."
      );
    }

    const data =
      await response.json();

    setEvents(data);
  }


  async function searchWeather(cityName) {
    const trimmedCity =
      cityName.trim();

    if (!trimmedCity) {
      setError(
        "Please enter a city name."
      );

      return;
    }

    setLoading(true);
    setError("");
    setWeather(null);

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/weather/?city=${encodeURIComponent(
            trimmedCity
          )}`
        );

      if (!response.ok) {
        let message =
          "Unable to fetch weather data.";

        try {
          const errorData =
            await response.json();

          if (errorData.detail) {
            message =
              errorData.detail;
          }
        } catch (err) {
          // Keep default error message.
        }

        throw new Error(message);
      }

      const data =
        await response.json();

      setWeather(data);

      setCity(data.city);

      setLastUpdated(
        new Date()
      );

      setSearchHistory(
        (previousHistory) => {
          const existingCities =
            previousHistory.filter(
              (item) =>
                item.toLowerCase() !==
                data.city.toLowerCase()
            );

          return [
            data.city,
            ...existingCities,
          ].slice(0, 6);
        }
      );

      await Promise.all([
        loadAnalytics(),
        loadReports(),
        loadEvents(),
      ]);
    } catch (err) {
      console.error(
        "Weather search error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while fetching weather."
      );
    } finally {
      setLoading(false);
    }
  }


  async function refreshWeather(
    showLoading = false
  ) {
    if (!city.trim()) {
      return;
    }

    if (showLoading) {
      setRefreshing(true);
    }

    setError("");

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/weather/?city=${encodeURIComponent(
            city.trim()
          )}`
        );

      if (!response.ok) {
        throw new Error(
          "Unable to refresh weather data."
        );
      }

      const data =
        await response.json();

      setWeather(data);

      setCity(data.city);

      setLastUpdated(
        new Date()
      );

      await Promise.all([
        loadAnalytics(),
        loadReports(),
        loadEvents(),
      ]);
    } catch (err) {
      console.error(
        "Weather refresh error:",
        err
      );

      if (showLoading) {
        setError(
          err.message ||
            "Unable to refresh weather data."
        );
      }
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  }


  async function handleManualRefresh() {
    await refreshWeather(true);
  }


  async function handleSearch(event) {
    event.preventDefault();

    await searchWeather(city);
  }


  async function handleHistorySearch(
    historyCity
  ) {
    setCity(historyCity);

    await searchWeather(
      historyCity
    );
  }


  useEffect(() => {
    if (!city.trim() || !weather) {
      return undefined;
    }

    const refreshInterval =
      setInterval(
        () => {
          refreshWeather();
        },
        10 * 60 * 1000
      );

    return () => {
      clearInterval(
        refreshInterval
      );
    };
  }, [city, weather]);


  function formatLastUpdated() {
    if (!lastUpdated) {
      return "Waiting for search";
    }

    return lastUpdated.toLocaleTimeString(
      undefined,
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  return (
    <div className="app">

      <div className="app-container">

        <header className="topbar">

          <div className="brand">

            <div className="brand-mark">
              🌩️
            </div>

            <div className="brand-text">

              <span className="brand-name">
                WeatherNova
              </span>

              <span className="brand-subtitle">
                Weather Intelligence
              </span>

            </div>

          </div>


          <div className="system-status">

            <span className="status-dot" />

            API Connected

          </div>

        </header>


        <main>

          <section className="hero">

            <div className="hero-content">

              <span className="hero-eyebrow">
                Real-Time Weather Intelligence
              </span>

              <h1>
                Understand the weather.
                <br />
                Before it changes.
              </h1>

              <p className="hero-description">
                WeatherNova combines live weather
                conditions, forecasts, risk analysis,
                events, and verified reports into one
                intelligence dashboard.
              </p>

            </div>

          </section>


          <section className="search-section">

            <form
              className="search-form"
              onSubmit={handleSearch}
            >

              <div className="search-input-wrapper">

                <input
                  className="search-input"
                  type="text"
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value
                    )
                  }
                  placeholder="Search for a city..."
                  disabled={
                    loading ||
                    refreshing
                  }
                />

              </div>


              <button
                className="search-button"
                type="submit"
                disabled={
                  loading ||
                  refreshing
                }
              >

                {loading
                  ? "Loading..."
                  : "Search Weather"}

              </button>

            </form>


            {searchHistory.length > 0 && (

              <div className="search-history">

                <span>
                  Recent searches
                </span>

                <div className="history-list">

                  {searchHistory.map(
                    (historyCity) => (

                      <button
                        type="button"
                        className="history-chip"
                        key={historyCity}
                        onClick={() =>
                          handleHistorySearch(
                            historyCity
                          )
                        }
                        disabled={
                          loading ||
                          refreshing
                        }
                      >

                        <span>
                          📍
                        </span>

                        {historyCity}

                      </button>

                    )
                  )}

                </div>

              </div>

            )}


            {error && (

              <div className="error-message">
                {error}
              </div>

            )}

          </section>


          {loading && (

            <section className="loading-section">

              <div className="loading-card">

                <div className="loading-spinner" />

                <div className="loading-content">

                  <strong>
                    Fetching weather intelligence
                  </strong>

                  <span>
                    Getting live conditions, forecast,
                    risk analysis, and weather events...
                  </span>

                </div>

              </div>

            </section>

          )}


          {weather && !loading && (

            <>

              <section className="weather-section">

                <div className="weather-main-card">

                  <span className="weather-location">
                    {weather.city},{" "}
                    {weather.state}
                  </span>


                  <div className="weather-main-content">

                    <div>

                      <p className="temperature">

                        {weather.temperature ??
                          "--"}

                        <span className="temperature-unit">
                          °C
                        </span>

                      </p>


                      <div className="weather-description">
                        {weather.description ||
                          weather.condition ||
                          "Current conditions"}
                      </div>

                    </div>


                    <div className="current-condition">

                      <span className="condition-icon">
                        {weather.condition_icon ||
                          "🌤️"}
                      </span>

                      <span className="condition-label">
                        {weather.condition ||
                          "Unknown conditions"}
                      </span>

                    </div>

                  </div>


                  <div className="weather-details">

                    <div className="detail-item">

                      <span className="detail-label">
                        Rain Chance
                      </span>

                      <span className="detail-value">
                        {weather.precipitation_probability ??
                          0}
                        %
                      </span>

                    </div>


                    <div className="detail-item">

                      <span className="detail-label">
                        Latitude
                      </span>

                      <span className="detail-value">
                        {weather.latitude ??
                          "--"}
                      </span>

                    </div>


                    <div className="detail-item">

                      <span className="detail-label">
                        Longitude
                      </span>

                      <span className="detail-value">
                        {weather.longitude ??
                          "--"}
                      </span>

                    </div>


                    <div className="detail-item">

                      <span className="detail-label">
                        Last Updated
                      </span>

                      <span className="detail-value">
                        {formatLastUpdated()}
                      </span>

                    </div>


                    <div className="detail-item">

                      <span className="detail-label">
                        Event Type
                      </span>

                      <span className="detail-value">
                        {weather.event_type ||
                          "Normal"}
                      </span>

                    </div>


                    <div className="detail-item">

                      <span className="detail-label">
                        Auto Refresh
                      </span>

                      <span className="detail-value">
                        Every 10 min
                      </span>

                    </div>

                  </div>

                </div>


                <div className="risk-card">

                  <div className="risk-header">

                    <div>

                      <h2 className="risk-title">
                        Weather Risk
                      </h2>

                      <span className="risk-subtitle">
                        Current atmospheric risk assessment
                      </span>

                    </div>


                    <span className="risk-level">
                      {weather.risk?.level ||
                        "Unknown"}
                    </span>

                  </div>


                  <div className="risk-score">

                    <span className="risk-score-number">
                      {weather.risk?.score ??
                        0}
                    </span>

                    <span className="risk-score-label">
                      / 100
                    </span>

                  </div>


                  <div className="risk-bar">

                    <div
                      className="risk-bar-fill"
                      style={{
                        width: `${Math.min(
                          weather.risk?.score ??
                            0,
                          100
                        )}%`,
                      }}
                    />

                  </div>


                  <div className="risk-reasons">

                    <div className="risk-reasons-title">
                      Risk factors
                    </div>


                    {(
                      weather.risk?.reasons ||
                      []
                    ).map(
                      (reason, index) => (

                        <div
                          className="risk-reason"
                          key={`${reason}-${index}`}
                        >
                          {reason}
                        </div>

                      )
                    )}

                  </div>

                </div>

              </section>


              <div className="weather-actions">

                <button
                  type="button"
                  className="refresh-button"
                  onClick={
                    handleManualRefresh
                  }
                  disabled={
                    refreshing ||
                    loading
                  }
                >

                  <span
                    className={
                      refreshing
                        ? "refresh-icon spinning"
                        : "refresh-icon"
                    }
                  >
                    ↻
                  </span>

                  {refreshing
                    ? "Refreshing..."
                    : "Refresh Weather"}

                </button>

                <span className="refresh-note">
                  Automatically updates every 10 minutes
                </span>

              </div>


              <ForecastChart
                forecast={
                  weather.forecast || []
                }
              />

            </>

          )}


          {analytics && (

            <section className="analytics-section">

              <div className="section-heading">

                <span className="section-eyebrow">
                  Intelligence Layer
                </span>

                <h2>
                  Weather Analytics
                </h2>

                <p>
                  Aggregated signals from WeatherNova's
                  collected weather reports and events.
                </p>

              </div>


              <AnalyticsCards
                analytics={analytics}
              />


              <div className="analytics-grid">

                <EventChart
                  data={
                    analytics.reports_by_event ||
                    []
                  }
                />

                <StateChart
                  data={
                    analytics.reports_by_state ||
                    []
                  }
                />

                <SeverityChart
                  data={
                    analytics.events_by_severity ||
                    []
                  }
                />

              </div>

            </section>

          )}


          <EventsList
            events={events}
          />


          <section className="reports-section">

            <div className="reports-header">

              <h2>
                Recent Weather Reports
              </h2>

              <p>
                Latest reports processed by WeatherNova.
              </p>

            </div>


            <div className="table-wrapper">

              <table className="reports-table">

                <thead>

                  <tr>

                    <th>
                      Source
                    </th>

                    <th>
                      Event
                    </th>

                    <th>
                      Location
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Trust
                    </th>

                    <th>
                      Time
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {reports.length === 0 ? (

                    <tr>

                      <td
                        colSpan="6"
                        style={{
                          textAlign:
                            "center",
                        }}
                      >
                        No weather reports yet.
                      </td>

                    </tr>

                  ) : (

                    reports.map(
                      (report) => (

                        <tr
                          key={report.id}
                        >

                          <td className="report-source">
                            {report.source}
                          </td>

                          <td className="report-event">
                            {report.event_type}
                          </td>

                          <td>
                            {report.city},{" "}
                            {report.state}
                          </td>

                          <td>

                            <span className="report-status">
                              {report.verification_status}
                            </span>

                          </td>

                          <td>
                            {report.trust_score}
                          </td>

                          <td>
                            {report.timestamp
                              ? new Date(
                                  report.timestamp
                                ).toLocaleString()
                              : "--"}
                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </section>

        </main>


        <footer className="footer">

          <span>
            <strong>
              WeatherNova
            </strong>{" "}
            Weather Intelligence Platform
          </span>

          <span>
            Open-Meteo · FastAPI · PostgreSQL
          </span>

        </footer>

      </div>

    </div>
  );
}


export default App;