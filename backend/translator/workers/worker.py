"""Celery worker for translator jobs."""

import logging
import os
import time
from pathlib import Path

from celery.schedules import schedule

from backend.translator.database import SessionLocal, init_engine
from backend.translator.models import Base
from backend.translator.models.translation_job import TranslationJob
from backend.translator.storage.paths import get_translated_upload_path
from backend.translator.tasks import celery_app

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=os.getenv("CELERY_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


def _bootstrap_database() -> None:
    engine = init_engine()
    if engine is not None:
        Base.metadata.create_all(bind=engine)


def _process_next_job() -> None:
    if SessionLocal is None:
        logger.warning("Translator database is not configured; skipping job poll")
        return

    with SessionLocal() as session:
        job = (
            session.query(TranslationJob)
            .filter(TranslationJob.status == "queued")
            .order_by(TranslationJob.created_at.asc(), TranslationJob.id.asc())
            .first()
        )

        if job is None:
            logger.info("No queued translation jobs found")
            return

        logger.info("Processing translation job %s", job.id)
        job.status = "processing"
        job.stage = "processing"
        job.progress = 10
        session.commit()

        time.sleep(5)

        translated_path = get_translated_upload_path(Path(job.source_file).name)
        translated_path.write_text(
            f"Translated document placeholder for job {job.id} into {job.target_language}\n",
            encoding="utf-8",
        )

        job.status = "completed"
        job.stage = "completed"
        job.progress = 100
        job.translated_file = str(translated_path)
        session.commit()
        logger.info("Completed translation job %s", job.id)


@celery_app.task(name="backend.translator.workers.worker.poll_translation_jobs")
def poll_translation_jobs() -> str:
    _process_next_job()
    return "ok"


celery_app.conf.beat_schedule = {
    "poll-translation-jobs-every-5-seconds": {
        "task": "backend.translator.workers.worker.poll_translation_jobs",
        "schedule": schedule(run_every=5.0),
    }
}


def main() -> None:
    _bootstrap_database()
    loglevel = os.getenv("CELERY_LOG_LEVEL", "INFO")
    celery_app.worker_main([
        "worker",
        "--loglevel",
        loglevel,
        "--beat",
    ])


if __name__ == "__main__":
    main()
