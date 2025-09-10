# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from routers import all_routers
from db.config import API_TITLE, API_DESCRIPTION, API_VERSION, ALLOWED_ORIGINS

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# รวม API routers
for router in all_routers:
    app.include_router(router)

# Health check
@app.get("/", tags=["Health"])
def root():
    return {"message": "API is running!"}

# ---------- สำคัญ: เสิร์ฟไฟล์สแตติก/หน้าเว็บ ----------
# ให้แน่ใจว่าโฟลเดอร์ templates/ อยู่ใน working directory เดียวกับที่รันแอป
# และไฟล์ชื่อ "calibration_pro.html" (สะกดให้ตรงเป๊ะ)
app.mount("/templates", StaticFiles(directory="templates", html=True), name="templates")

# ทางเลือกที่คุ้นเคย: /web/* map ไปที่ templates/
app.mount("/web", StaticFiles(directory="templates", html=True), name="web")

# ทางลัดเปิดหน้าเลย
@app.get("/calibration_pro", include_in_schema=False)
def open_calibration_pro():
    # ถ้าต้องการ serve เป็นไฟล์ตรง ๆ ก็ใช้ FileResponse ได้เช่นกัน
    return RedirectResponse(url="/web/calibration_pro.html", status_code=307)

# ถ้าอยากเปิดหน้า default ที่ root (แค่ตัวอย่าง, ไม่บังคับ)
@app.get("/ui", include_in_schema=False)
def ui_redirect():
    return RedirectResponse(url="/web/calibration_pro.html", status_code=307)
