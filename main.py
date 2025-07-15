from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import all_routers
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

for router in all_routers:
    app.include_router(router)

# ✅Check start api
@app.get("/", tags=["Health"])
def root():
    return {"message": "API is running!"}

