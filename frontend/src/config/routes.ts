import { lazy } from 'react';
import type { ComponentType } from 'react';

// API Configuration - Centralized base URLs
export const API_CONFIG = {
  BASE_URL: 'http://10.216.128.133:8080',
  WS_BASE_URL: 'ws://10.216.128.133:8080'
} as const;

// Lazy load components
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Calibration = lazy(() => import('../pages/Calibration'));
const StationDetail = lazy(() => import('../pages/StationDetail'));
const TesterDetail = lazy(() => import('../pages/TesterDetail'));
const FixtureDetail = lazy(() => import('../pages/FixtureDetail'));
const OneDaySearch = lazy(() => import('../pages/OneDaySearch'));
const DetailPage = lazy(() => import('../pages/DetailPage'));

// Route configuration interface
export interface RouteConfig {
  path: string;
  component: ComponentType<any>;
  title: string;
  description?: string;
  icon?: string;
  showInNav?: boolean;
  requiresParams?: string[];
  websocketEndpoint?: string;
  defaultParams?: Record<string, string>;
}

// Centralized route configuration
export const routes: RouteConfig[] = [
  {
    path: '/',
    component: Dashboard,
    title: 'Dashboard',
    description: 'Real-time failure analysis and monitoring',
    icon: '📊',
    showInNav: true,
    websocketEndpoint: '/failures/ws/filter',
    defaultParams: {
      lineId: 'BMA01',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  },
  {
    path: '/calibration',
    component: Calibration,
    title: 'Calibration',
    description: 'Professional equipment calibration tracking system',
    icon: '🔬',
    showInNav: true
  },
  {
    path: '/one-day-search',
    component: OneDaySearch,
    title: 'CPK',
    description: 'Process Capability Index analysis and daily search',
    icon: '📈',
    showInNav: true
  },
  {
    path: '/detail',
    component: DetailPage,
    title: 'Detail Page',
    description: 'Detailed CPK analysis',
    icon: '📊',
    showInNav: false,
    requiresParams: ['day', 'model', 'tester', 'step', 'test_item', 'test_desc', 'order_idx']
  },
  {
    path: '/station-detail',
    component: StationDetail,
    title: 'Station Detail',
    description: 'Station-specific failure analysis',
    icon: '⚙️',
    showInNav: false,
    requiresParams: ['lineId', 'station', 'workDate'],
    websocketEndpoint: '/failures/ws/station'
  },
  {
    path: '/tester-detail',
    component: TesterDetail,
    title: 'Tester Detail',
    description: 'Tester failure analysis',
    icon: '🔧',
    showInNav: false,
    requiresParams: ['lineId'],
    websocketEndpoint: '/failures/ws/tester',
    defaultParams: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  },
  {
    path: '/fixture-detail',
    component: FixtureDetail,
    title: 'Fixture Detail',
    description: 'Fixture failure analysis',
    icon: '🔩',
    showInNav: false,
    requiresParams: ['lineId'],
    websocketEndpoint: '/failures/ws/fixture',
    defaultParams: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  }
];

// Helper functions for route management
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return routes.find(route => route.path === path);
};

export const getNavigationRoutes = (): RouteConfig[] => {
  return routes.filter(route => route.showInNav);
};

export const buildRouteUrl = (path: string, params?: Record<string, string>): string => {
  if (!params || Object.keys(params).length === 0) {
    return path;
  }
  
  const searchParams = new URLSearchParams(params);
  return `${path}?${searchParams.toString()}`;
};

export const validateRouteParams = (route: RouteConfig, params: Record<string, string>): boolean => {
  if (!route.requiresParams) return true;
  
  return route.requiresParams.every(param => params[param] && params[param].trim() !== '');
};

// WebSocket URL builder
export const buildWebSocketUrl = (route: RouteConfig, params: Record<string, string>): string => {
  if (!route.websocketEndpoint) return '';
  
  const baseUrl = `${API_CONFIG.WS_BASE_URL}${route.websocketEndpoint}`;
  const searchParams = new URLSearchParams();
  
  // Add required parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      searchParams.set(key, value);
    }
  });
  
  // Add default parameters if not provided
  if (route.defaultParams) {
    Object.entries(route.defaultParams).forEach(([key, value]) => {
      if (!searchParams.has(key)) {
        searchParams.set(key, value);
      }
    });
  }
  
  // Add timestamp for cache busting
  searchParams.set('_ts', Date.now().toString());
  
  return `${baseUrl}?${searchParams.toString()}`;
};

// Route metadata for dynamic page titles and descriptions
export const getPageMetadata = (path: string, params?: Record<string, string>) => {
  const route = getRouteByPath(path);
  if (!route) return { title: 'Delta Dashboard', description: '' };
  
  let title = route.title;
  let description = route.description || '';
  
  // Customize title based on route and parameters
  switch (path) {
    case '/station-detail':
      if (params?.station && params?.lineId) {
        title = `${params.station} - Line ${params.lineId}`;
        description = `Station failure analysis for ${params.station}`;
      }
      break;
    case '/tester-detail':
      if (params?.lineId) {
        title = `Tester Analysis - Line ${params.lineId}`;
        if (params?.station) {
          title += ` - ${params.station}`;
        }
      }
      break;
    case '/fixture-detail':
      if (params?.lineId) {
        title = `Fixture Analysis - Line ${params.lineId}`;
      }
      break;
  }
  
  return { title: `${title} | Delta Dashboard`, description };
};

// Export route paths as constants for type safety
export const ROUTE_PATHS = {
  DASHBOARD: '/',
  CALIBRATION: '/calibration',
  CPK: '/cpk',
  ONE_DAY_SEARCH: '/one-day-search',
  DETAIL: '/detail',
  STATION_DETAIL: '/station-detail',
  TESTER_DETAIL: '/tester-detail',
  FIXTURE_DETAIL: '/fixture-detail'
} as const;

export type RoutePath = typeof ROUTE_PATHS[keyof typeof ROUTE_PATHS];
