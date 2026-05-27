"""CRUD helpers for translation jobs."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.translator.models.translation_job import TranslationJob


def create_translation_job(
    session: Session,
    *,
    user_id: Optional[str],
    source_file: str,
    target_language: str,
) -> TranslationJob:
    job = TranslationJob(
        user_id=user_id,
        status="queued",
        stage="queued",
        progress=0,
        source_file=source_file,
        translated_file=None,
        target_language=target_language,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def get_translation_job(session: Session, job_id: int) -> TranslationJob | None:
    return session.query(TranslationJob).filter(TranslationJob.id == job_id).first()


def delete_translation_job(session: Session, job_id: int) -> TranslationJob:
    job = get_translation_job(session, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Translation job not found")

    session.delete(job)
    session.commit()
    return job

