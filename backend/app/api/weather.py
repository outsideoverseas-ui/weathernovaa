from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests

from app.database.connection import get_db
from app.models.report import WeatherReport
from app.models.event import WeatherEvent


router = APIRouter(
    prefix="/weather",
    tags=["Weather"],
)


def get_weather_condition(weather_code):
    conditions = {
        0: {
            "label": "Clear Sky",
            "icon": "☀️",
        },
        1: {
            "label": "Mainly Clear",
            "icon": "🌤️",
        },
        2: {
            "label": "Partly Cloudy",
            "icon": "⛅",
        },
        3: {
            "label": "Overcast",
            "icon": "☁️",
        },
        45: {
            "label": "Fog",
            "icon": "🌫️",
        },
        48: {
            "label": "Freezing Fog",
            "icon": "🌫️",
        },
        51: {
            "label": "Light Drizzle",
            "icon": "🌦️",
        },
        53: {
            "label": "Moderate Drizzle",
            "icon": "🌦️",
        },
        55: {
            "label": "Dense Drizzle",
            "icon": "🌧️",
        },
        56: {
            "label": "Light Freezing Drizzle",
            "icon": "🌧️",
        },
        57: {
            "label": "Dense Freezing Drizzle",
            "icon": "🌧️",
        },
        61: {
            "label": "Light Rain",
            "icon": "🌦️",
        },
        63: {
            "label": "Moderate Rain",
            "icon": "🌧️",
        },
        65: {
            "label": "Heavy Rain",
            "icon": "🌧️",
        },
        66: {
            "label": "Light Freezing Rain",
            "icon": "🌧️",
        },
        67: {
            "label": "Heavy Freezing Rain",
            "icon": "🌧️",
        },
        71: {
            "label": "Light Snow",
            "icon": "🌨️",
        },
        73: {
            "label": "Moderate Snow",
            "icon": "❄️",
        },
        75: {
            "label": "Heavy Snow",
            "icon": "❄️",
        },
        77: {
            "label": "Snow Grains",
            "icon": "🌨️",
        },
        80: {
            "label": "Light Rain Showers",
            "icon": "🌦️",
        },
        81: {
            "label": "Moderate Rain Showers",
            "icon": "🌧️",
        },
        82: {
            "label": "Violent Rain Showers",
            "icon": "⛈️",
        },
        85: {
            "label": "Light Snow Showers",
            "icon": "🌨️",
        },
        86: {
            "label": "Heavy Snow Showers",
            "icon": "❄️",
        },
        95: {
            "label": "Thunderstorm",
            "icon": "⛈️",
        },
        96: {
            "label": "Thunderstorm with Hail",
            "icon": "⛈️",
        },
        99: {
            "label": "Severe Thunderstorm with Hail",
            "icon": "⛈️",
        },
    }

    return conditions.get(
        weather_code,
        {
            "label": "Unknown Weather",
            "icon": "🌡️",
        },
    )


def get_weather_event_type(weather_code):
    if weather_code in [95, 96, 99]:
        return "Thunderstorm"

    if weather_code in [
        51,
        53,
        55,
        56,
        57,
        61,
        63,
        65,
        66,
        67,
        80,
        81,
        82,
    ]:
        return "Rain"

    if weather_code in [
        71,
        73,
        75,
        77,
        85,
        86,
    ]:
        return "Snow"

    if weather_code in [45, 48]:
        return "Fog"

    return "Clear/Cloudy"


def get_event_severity(weather_code):
    if weather_code in [95, 99]:
        return "high"

    if weather_code in [96]:
        return "moderate"

    if weather_code in [65, 67, 82]:
        return "high"

    if weather_code in [63, 66, 81]:
        return "moderate"

    if weather_code in [
        51,
        53,
        56,
        61,
        80,
    ]:
        return "low"

    if weather_code in [73, 75, 86]:
        return "moderate"

    if weather_code in [71, 77, 85]:
        return "low"

    if weather_code in [45, 48]:
        return "low"

    return "normal"


def calculate_risk(
    weather_code,
    precipitation_probability,
):
    risk_score = 0
    reasons = []

    if weather_code in [95, 96, 99]:
        risk_score += 60

        reasons.append(
            "Thunderstorm conditions detected."
        )

    elif weather_code in [65, 67, 82]:
        risk_score += 50

        reasons.append(
            "Heavy precipitation conditions detected."
        )

    elif weather_code in [63, 66, 81]:
        risk_score += 35

        reasons.append(
            "Moderate precipitation conditions detected."
        )

    elif weather_code in [
        51,
        53,
        56,
        61,
        80,
    ]:
        risk_score += 20

        reasons.append(
            "Light precipitation conditions detected."
        )

    elif weather_code in [
        71,
        73,
        75,
        77,
        85,
        86,
    ]:
        risk_score += 35

        reasons.append(
            "Snow or snow shower conditions detected."
        )

    elif weather_code in [45, 48]:
        risk_score += 20

        reasons.append(
            "Reduced visibility due to fog conditions."
        )

    if (
        precipitation_probability is not None
        and precipitation_probability >= 70
    ):
        risk_score += 20

        reasons.append(
            "High probability of precipitation."
        )

    elif (
        precipitation_probability is not None
        and precipitation_probability >= 40
    ):
        risk_score += 10

        reasons.append(
            "Moderate probability of precipitation."
        )

    risk_score = min(
        risk_score,
        100,
    )

    if risk_score >= 70:
        risk_level = "High"

    elif risk_score >= 40:
        risk_level = "Moderate"

    elif risk_score >= 20:
        risk_level = "Low"

    else:
        risk_level = "Normal"

    if not reasons:
        reasons.append(
            "No significant weather risk detected."
        )

    return {
        "score": risk_score,
        "level": risk_level,
        "reasons": reasons,
    }


@router.get("/")
def get_weather(
    city: str,
    db: Session = Depends(get_db),
):
    geocoding_url = (
        "https://geocoding-api.open-meteo.com/v1/search"
    )

    geocoding_params = {
        "name": city,
        "count": 1,
        "language": "en",
        "format": "json",
    }

    try:
        geocoding_response = requests.get(
            geocoding_url,
            params=geocoding_params,
            timeout=10,
        )

        geocoding_response.raise_for_status()

        geocoding_data = (
            geocoding_response.json()
        )

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to reach weather "
                "location service."
            ),
        ) from exc

    results = geocoding_data.get("results")

    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"City '{city}' not found.",
        )

    location = results[0]

    latitude = location["latitude"]
    longitude = location["longitude"]

    resolved_city = location.get(
        "name",
        city,
    )

    country = location.get(
        "country",
        "",
    )

    country_code = location.get(
        "country_code",
        "",
    )

    state = location.get(
        "admin1",
        "",
    )

    weather_url = (
        "https://api.open-meteo.com/v1/forecast"
    )

    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "wind_speed_10m,"
            "weather_code"
        ),
        "daily": (
            "weather_code,"
            "temperature_2m_max,"
            "temperature_2m_min,"
            "precipitation_probability_max"
        ),
        "forecast_days": 7,
        "timezone": "auto",
    }

    try:
        weather_response = requests.get(
            weather_url,
            params=weather_params,
            timeout=10,
        )

        weather_response.raise_for_status()

        weather_data = weather_response.json()

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach weather service.",
        ) from exc

    current = weather_data.get("current")

    daily = weather_data.get("daily")

    if not current:
        raise HTTPException(
            status_code=502,
            detail="Current weather data is unavailable.",
        )

    if not daily:
        raise HTTPException(
            status_code=502,
            detail="Forecast data is unavailable.",
        )

    temperature = current.get(
        "temperature_2m"
    )

    humidity = current.get(
        "relative_humidity_2m"
    )

    wind_speed = current.get(
        "wind_speed_10m"
    )

    weather_code = current.get(
        "weather_code"
    )

    condition = get_weather_condition(
        weather_code
    )

    event_type = get_weather_event_type(
        weather_code
    )

    severity = get_event_severity(
        weather_code
    )

    precipitation_probabilities = daily.get(
        "precipitation_probability_max",
        [],
    )

    current_precipitation_probability = (
        precipitation_probabilities[0]
        if precipitation_probabilities
        else None
    )

    risk = calculate_risk(
        weather_code,
        current_precipitation_probability,
    )

    existing_report = (
        db.query(WeatherReport)
        .filter(
            WeatherReport.city == resolved_city,
            WeatherReport.event_type == event_type,
        )
        .order_by(
            WeatherReport.timestamp.desc()
        )
        .first()
    )

    is_duplicate = (
        existing_report is not None
    )

    new_report = WeatherReport(
        source="Open-Meteo",
        description=(
            f"{condition['label']} weather "
            f"observation for {resolved_city}"
        ),
        event_type=event_type,
        city=resolved_city,
        state=state,
        latitude=latitude,
        longitude=longitude,
        verification_status="verified",
        confidence_score=1.0,
        trust_score=1.0,
        is_duplicate=is_duplicate,
    )

    db.add(new_report)

    if event_type != "Clear/Cloudy":
        new_event = WeatherEvent(
            event_type=event_type,
            title=(
                f"{condition['label']} detected "
                f"in {resolved_city}"
            ),
            city=resolved_city,
            state=state,
            latitude=latitude,
            longitude=longitude,
            severity=severity,
            status="active",
        )

        db.add(new_event)

    db.commit()

    db.refresh(new_report)

    forecast = []

    dates = daily.get(
        "time",
        [],
    )

    weather_codes = daily.get(
        "weather_code",
        [],
    )

    max_temperatures = daily.get(
        "temperature_2m_max",
        [],
    )

    min_temperatures = daily.get(
        "temperature_2m_min",
        [],
    )

    precipitation_probabilities = daily.get(
        "precipitation_probability_max",
        [],
    )

    for index, forecast_date in enumerate(
        dates
    ):
        forecast_weather_code = (
            weather_codes[index]
            if index < len(weather_codes)
            else None
        )

        forecast_condition = (
            get_weather_condition(
                forecast_weather_code
            )
        )

        forecast.append(
            {
                "date": forecast_date,

                "weather_code": (
                    forecast_weather_code
                ),

                "condition": (
                    forecast_condition["label"]
                ),

                "icon": (
                    forecast_condition["icon"]
                ),

                "temperature_max": (
                    max_temperatures[index]
                    if index
                    < len(max_temperatures)
                    else None
                ),

                "temperature_min": (
                    min_temperatures[index]
                    if index
                    < len(min_temperatures)
                    else None
                ),

                "precipitation_probability": (
                    precipitation_probabilities[index]
                    if index
                    < len(
                        precipitation_probabilities
                    )
                    else None
                ),
            }
        )

    return {
        "city": resolved_city,

        "country": country,

        "country_code": country_code,

        "state": state,

        "latitude": latitude,

        "longitude": longitude,

        "temperature": temperature,

        "humidity": humidity,

        "wind_speed": wind_speed,

        "weather_code": weather_code,

        "condition": condition["label"],

        "condition_icon": condition["icon"],

        "event_type": event_type,

        "severity": severity,

        "is_duplicate": is_duplicate,

        "report_id": new_report.id,

        "precipitation_probability": (
            current_precipitation_probability
        ),

        "risk": risk,

        "forecast": forecast,
    }