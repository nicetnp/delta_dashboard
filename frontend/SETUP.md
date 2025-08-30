# การติดตั้งและใช้งาน Frontend

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Node.js
ดาวน์โหลดและติดตั้ง Node.js จาก [nodejs.org](https://nodejs.org/) (เวอร์ชัน 18+)

### 2. ตรวจสอบการติดตั้ง
```bash
node --version
npm --version
```

### 3. ติดตั้ง Dependencies
```bash
npm install
```

### 4. รัน Development Server
```bash
npm run dev
```

### 5. เปิดเบราว์เซอร์
ไปที่ `http://localhost:3000`

## คำสั่งที่มีประโยชน์

```bash
# Development
npm run dev          # รัน development server
npm run build        # Build สำหรับ production
npm run preview      # Preview build
npm run lint         # ตรวจสอบ code quality
```

## โครงสร้างโปรเจค

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── CalibrationForm.tsx    # หน้าจัดการ Calibration
│   │   ├── FailureIndex.tsx       # หน้าจัดการ Failure
│   │   ├── FixtureDetail.tsx      # หน้าแสดงรายละเอียด Fixture
│   │   ├── Navigation.tsx         # Navigation bar
│   │   ├── StationDetail.tsx      # หน้าแสดงรายละเอียด Station
│   │   └── TesterDetail.tsx       # หน้าแสดงรายละเอียด Tester
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles with Tailwind
├── package.json            # Dependencies และ scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── index.html              # HTML entry point
```

## การเชื่อมต่อกับ Backend

Frontend จะเชื่อมต่อกับ backend API ที่ `http://127.0.0.1:8000`

### API Endpoints ที่ใช้:
- `GET /calibration/{id}` - ดึงข้อมูล calibration
- `POST /calibration/` - สร้าง calibration ใหม่
- `DELETE /calibration/{id}?deleted_by={name}` - ลบ calibration

## การพัฒนา

### เพิ่ม Component ใหม่:
1. สร้างไฟล์ `.tsx` ใน `src/components/`
2. Import ใน `App.tsx`
3. เพิ่ม Route ใน `App.tsx`

### การใช้ Tailwind CSS:
- ใช้ utility classes ของ Tailwind โดยตรง
- ดู documentation ได้ที่ [tailwindcss.com](https://tailwindcss.com/)

### การเพิ่ม Type:
- สร้าง interface ในไฟล์ component หรือแยกไฟล์ types
- ใช้ TypeScript สำหรับ type safety

## การแก้ไขปัญหา

### Port 3000 ถูกใช้งาน:
```bash
# เปลี่ยน port ใน vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,  # เปลี่ยนเป็น port อื่น
    open: true
  }
})
```

### Dependencies ไม่ตรงกัน:
```bash
rm -rf node_modules package-lock.json
npm install
```

## การ Deploy

### Build สำหรับ Production:
```bash
npm run build
```

ไฟล์ที่ build จะอยู่ใน folder `dist/` ซึ่งสามารถ deploy ไปยัง web server ได้

### ใช้กับ Backend:
- Build frontend และ copy ไฟล์จาก `dist/` ไปยัง backend
- หรือ deploy แยกกันและใช้ CORS
