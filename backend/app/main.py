from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import sessions, users

app = FastAPI(title="LeetEx API", version="0.5.0")

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
