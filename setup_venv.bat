@echo off
REM ตั้งค่า path ไปยัง Python ที่ติดตั้ง
set PYTHON_PATH="C:\Users\thasongs\AppData\Local\Programs\Python\Python312\python.exe"

REM ตรวจสอบว่า python.exe ใช้งานได้
%PYTHON_PATH% --version
if errorlevel 1 (
    echo [ERROR] Python ไม่เจอที่ %PYTHON_PATH%
    pause
    exit /b
)

REM สร้าง virtual environment ในโปรเจกต์
echo สร้าง virtualenv...
%PYTHON_PATH% -m venv venv

REM เปิดใช้งาน virtualenv และอัปเกรด pip
echo อัปเกรด pip...
call venv\Scripts\activate
python -m pip install --upgrade pip

echo เสร็จสิ้น! virtualenv ถูกสร้างที่ %CD%\venv
echo ใน PyCharm, เลือก interpreter ที่:
echo %CD%\venv\Scripts\python.exe

pause
