import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.analysis.worker import start_analysis_worker, stop_analysis_worker
from app.routers import sessions, users

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler: BackgroundScheduler | None = start_analysis_worker()
    try:
        yield
    finally:
        stop_analysis_worker(scheduler)


app = FastAPI(title="LeetEx API", version="0.5.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://oemcjojcdpdkcaominnhhehamfjokjaa",
        "http://localhost:3000",
        "https://leetcode.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.5.0"}


app.include_router(sessions.router)
app.include_router(users.router)
