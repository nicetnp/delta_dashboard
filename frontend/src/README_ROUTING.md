# Delta Dashboard - Unified Routing System

## Overview
ระบบ routing แบบรวมศูนย์ที่จัดการทุกหน้าในไฟล์เดียว ออกแบบให้ไม่ทำลายโค้ดเดิมและง่ายต่อการบำรุงรักษา

## Architecture

### 1. Route Configuration (`/config/routes.ts`)
- **Centralized Configuration**: กำหนด route ทั้งหมดในที่เดียว
- **Lazy Loading**: โหลด component เมื่อจำเป็นเท่านั้น
- **Type Safety**: TypeScript interfaces สำหรับ route configuration
- **WebSocket Integration**: กำหนด WebSocket endpoints สำหรับแต่ละ route
- **Parameter Validation**: ตรวจสอบ required parameters

### 2. Route Handler (`/components/RouteHandler.tsx`)
- **Dynamic Component Loading**: โหลด component ตาม route configuration
- **Parameter Validation**: ตรวจสอบ required parameters อัตโนมัติ
- **Error Handling**: จัดการ error และแสดงหน้า error ที่เหมาะสม
- **Page Metadata**: อัปเดต page title และ description อัตโนมัติ
- **Loading States**: แสดง loading spinner ระหว่างโหลด component

### 3. Dynamic Layout (`/components/DynamicLayout.tsx`)
- **Smart Navigation**: แสดง navigation items จาก route configuration
- **Context-Aware**: ปรับ layout ตาม route type (main pages vs detail pages)
- **Responsive Design**: รองรับทั้ง desktop และ mobile
- **Page Title Display**: แสดง page title สำหรับ detail pages

### 4. Navigation Hook (`/hooks/useRouteNavigation.ts`)
- **Centralized Navigation**: functions สำหรับ navigate ไปยัง routes ต่างๆ
- **Parameter Management**: จัดการ URL parameters
- **Type Safety**: TypeScript support สำหรับ route paths
- **Helper Functions**: utility functions สำหรับ navigation

### 5. Route Utilities (`/utils/routeHelpers.ts`)
- **WebSocket Manager**: จัดการ WebSocket connections
- **URL Utilities**: helper functions สำหรับ URL parameters
- **Validation**: ตรวจสอบ route parameters
- **Performance**: debounce และ throttle utilities

## Usage Examples

### Adding New Route
```typescript
// In /config/routes.ts
{
  path: '/new-page',
  component: lazy(() => import('../pages/NewPage')),
  title: 'New Page',
  description: 'Description of new page',
  icon: '🆕',
  showInNav: true,
  requiresParams: ['requiredParam'],
  websocketEndpoint: '/ws/new-endpoint'
}
```

### Using Navigation Hook
```typescript
// In any component
import { useRouteNavigation } from '../hooks/useRouteNavigation';

function MyComponent() {
  const { goToDashboard, goToStationDetail, updateParams } = useRouteNavigation();
  
  const handleClick = () => {
    goToStationDetail('BMA01', 'VFLASH1', '2024-01-01');
  };
  
  return <button onClick={handleClick}>Go to Station</button>;
}
```

### WebSocket Integration
```typescript
// In page component
import { useRouteWebSocket } from '../utils/routeHelpers';

function MyPage() {
  const { getCurrentParams } = useRouteNavigation();
  const wsConnection = useRouteWebSocket('/my-route', getCurrentParams());
  
  useEffect(() => {
    if (wsConnection) {
      wsConnection.connect(
        (data) => setData(data),
        (error) => console.error(error)
      );
      
      return () => wsConnection.disconnect();
    }
  }, [wsConnection]);
}
```

## Benefits

### 1. Maintainability
- **Single Source of Truth**: ทุก route อยู่ในไฟล์เดียว
- **Consistent Structure**: โครงสร้างเดียวกันสำหรับทุก route
- **Easy Updates**: แก้ไข route ในที่เดียว

### 2. Performance
- **Lazy Loading**: โหลด component เมื่อจำเป็น
- **Code Splitting**: แยก bundle ตาม route
- **WebSocket Management**: จัดการ connections อย่างมีประสิทธิภาพ

### 3. Developer Experience
- **Type Safety**: TypeScript support ทั้งหมด
- **Auto-completion**: IDE support สำหรับ route paths
- **Error Prevention**: ตรวจสอบ parameters อัตโนมัติ

### 4. User Experience
- **Fast Loading**: lazy loading และ code splitting
- **Error Handling**: หน้า error ที่เป็นมิตร
- **Responsive**: รองรับทุก device

## Migration from Old System

### Before (App.tsx)
```typescript
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/calibration" element={<Calibration />} />
  // ... more routes
</Routes>
```

### After (App.tsx)
```typescript
<Routes>
  {routes.map((route) => (
    <Route key={route.path} path={route.path} element={<RouteHandler />} />
  ))}
</Routes>
```

## File Structure
```
src/
├── config/
│   └── routes.ts              # Route configuration
├── components/
│   ├── RouteHandler.tsx       # Main route handler
│   ├── DynamicLayout.tsx      # Smart layout component
│   └── RouteWrapper.tsx       # HOC for route utilities
├── hooks/
│   └── useRouteNavigation.ts  # Navigation hook
├── utils/
│   └── routeHelpers.ts        # Route utilities
└── pages/
    ├── Dashboard.tsx          # Existing pages (unchanged)
    ├── Calibration.tsx
    └── ...
```

## Best Practices

1. **Always use route constants**: ใช้ `ROUTE_PATHS` แทนการ hardcode paths
2. **Validate parameters**: ใช้ `validateRouteParams` ก่อน navigate
3. **Handle errors**: ใช้ error boundaries และ error pages
4. **Optimize performance**: ใช้ lazy loading และ code splitting
5. **Keep routes organized**: จัดกลุ่ม routes ตาม functionality

## Troubleshooting

### Common Issues
1. **Missing parameters**: ตรวจสอบ `requiresParams` ใน route configuration
2. **WebSocket errors**: ตรวจสอบ `websocketEndpoint` และ parameters
3. **Layout issues**: ตรวจสอบ `showInNav` และ route type
4. **Performance**: ใช้ React DevTools เพื่อตรวจสอบ re-renders

### Debug Tips
- ใช้ browser dev tools เพื่อดู route parameters
- ตรวจสอบ console logs สำหรับ WebSocket connections
- ใช้ React DevTools Profiler สำหรับ performance analysis
