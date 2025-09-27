from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import datetime

router = APIRouter(prefix="/export", tags=["Export"])

ROOT_PATH = Path(r"\\10.150.208.54\holmes$\TestData")


def get_base_folders(lineId: str, fixture: str):
    """เลือก base folder ตามเงื่อนไข"""
    if lineId.upper() == "BMA01":
        return ["BMW_BEV", "BMW_Project"]
    elif fixture.upper() == "ONSTATION":
        return ["BMW_BEV"]
    elif fixture.isdigit():
        return ["BMW_Project"]
    return ["BMW_BEV"]


@router.get("/search")
def search_report(sn: str, date: str, tester: str, testerId: str, lineId: str, fixture: str):
    """
    ค้นหาไฟล์จาก SN + Date + Tester + TesterId
    โดยเลือก folder base ตาม lineId/fixture
    """
    try:
        dt = datetime.datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    year_folder = dt.strftime("%y")  # "2025" -> "25"
    month_folder = dt.strftime("%m") # "09"

    base_folders = get_base_folders(lineId, fixture)
    results = []

    for base in base_folders:
        target_path = ROOT_PATH / base / year_folder / month_folder
        if not target_path.exists():
            continue

        pattern = f"*{sn}*{date}*{tester}_{testerId}*.html"
        matches = list(target_path.rglob(pattern))

        for file in matches:
            results.append({
                "filename": file.name,
                "path": str(file),
                "url": f"/export/download/{file.name}?date={date}&base={base}"
            })

    if not results:
        raise HTTPException(status_code=404, detail="No matching report found")

    return results


@router.get("/download/{filename}")
def download_report(filename: str, date: str, base: str):
    """
    ดาวน์โหลดไฟล์ โดยใช้ base folder + date
    """
    try:
        dt = datetime.datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    year_folder = dt.strftime("%y")
    month_folder = dt.strftime("%m")
    target_path = ROOT_PATH / base / year_folder / month_folder

    files = list(target_path.rglob(filename))
    if not files:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = files[0]
    return FileResponse(path=file_path, media_type="text/html", filename=file_path.name)
