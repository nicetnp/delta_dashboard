from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import failure_router,failure_today_router,failure_today_ws_router,failure_heatup_router,failure_atsone_router

from db.config import API_TITLE, API_DESCRIPTION, API_VERSION, ALLOWED_ORIGINS

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Register routers
app.include_router(failure_router.router)
app.include_router(failure_today_router.router)
app.include_router(failure_today_ws_router.router)
app.include_router(failure_heatup_router.router)
app.include_router(failure_atsone_router.router)

# ✅Check start api
@app.get("/", tags=["Health"])
def root():
    return {"message": "API is running!"}

