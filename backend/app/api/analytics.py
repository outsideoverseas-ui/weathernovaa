from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models import WeatherEvent, WeatherReport


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get("/summary")
def analytics_summary(
    db: Session = Depends(get_db),
):
    total_reports = (
        db.query(
            func.count(WeatherReport.id)
        ).scalar()
        or 0
    )

    total_events = (
        db.query(
            func.count(WeatherEvent.id)
        ).scalar()
        or 0
    )

    verified_reports = (
        db.query(
            func.count(WeatherReport.id)
        )
        .filter(
            WeatherReport.verification_status == "verified"
        )
        .scalar()
        or 0
    )

    duplicate_reports = (
        db.query(
            func.count(WeatherReport.id)
        )
        .filter(
            WeatherReport.is_duplicate.is_(True)
        )
        .scalar()
        or 0
    )

    return {
        "total_reports": total_reports,
        "total_events": total_events,
        "verified_reports": verified_reports,
        "duplicate_reports": duplicate_reports,
    }


@router.get("/reports-by-event")
def reports_by_event(
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            WeatherReport.event_type,
            func.count(WeatherReport.id).label("count"),
        )
        .group_by(
            WeatherReport.event_type
        )
        .all()
    )

    return [
        {
            "event_type": event_type or "Unknown",
            "count": count,
        }
        for event_type, count in results
    ]


@router.get("/reports-by-state")
def reports_by_state(
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            WeatherReport.state,
            func.count(WeatherReport.id).label("count"),
        )
        .group_by(
            WeatherReport.state
        )
        .all()
    )

    return [
        {
            "state": state or "Unknown",
            "count": count,
        }
        for state, count in results
    ]


@router.get("/events-by-severity")
def events_by_severity(
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            WeatherEvent.severity,
            func.count(WeatherEvent.id).label("count"),
        )
        .group_by(
            WeatherEvent.severity
        )
        .all()
    )

    return [
        {
            "severity": severity or "Unknown",
            "count": count,
        }
        for severity, count in results
    ]