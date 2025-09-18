import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import { buildRouteUrl, ROUTE_PATHS, type RoutePath } from '../config/routes';

// Custom hook for centralized navigation management
export function useRouteNavigation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get current parameters as object
  const getCurrentParams = useCallback(() => {
    return Object.fromEntries(searchParams.entries());
  }, [searchParams]);

  // Navigate to a specific route with parameters
  const navigateTo = useCallback((path: RoutePath, params?: Record<string, string>) => {
    const url = buildRouteUrl(path, params);
    navigate(url);
  }, [navigate]);

  // Navigate to dashboard
  const goToDashboard = useCallback((params?: Record<string, string>) => {
    navigateTo(ROUTE_PATHS.DASHBOARD, params);
  }, [navigateTo]);

  // Navigate to calibration
  const goToCalibration = useCallback(() => {
    navigateTo(ROUTE_PATHS.CALIBRATION);
  }, [navigateTo]);

  // Navigate to station detail
  const goToStationDetail = useCallback((lineId: string, station: string, workDate?: string) => {
    const params = {
      lineId,
      station,
      workDate: workDate || new Date().toISOString().split('T')[0]
    };
    navigateTo(ROUTE_PATHS.STATION_DETAIL, params);
  }, [navigateTo]);

  // Navigate to tester detail
  const goToTesterDetail = useCallback((lineId: string, options?: {
    station?: string;
    startDate?: string;
    endDate?: string;
    workDate?: string;
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const params: Record<string, string> = {
      lineId,
      startDate: options?.startDate || today,
      endDate: options?.endDate || today
    };
    
    if (options?.station) params.station = options.station;
    if (options?.workDate) params.workDate = options.workDate;
    
    navigateTo(ROUTE_PATHS.TESTER_DETAIL, params);
  }, [navigateTo]);

  // Navigate to fixture detail
  const goToFixtureDetail = useCallback((lineId: string, options?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const params = {
      lineId,
      startDate: options?.startDate || today,
      endDate: options?.endDate || today
    };
    navigateTo(ROUTE_PATHS.FIXTURE_DETAIL, params);
  }, [navigateTo]);

  // Go back to previous page
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Update current route parameters without navigation
  const updateParams = useCallback((newParams: Record<string, string>) => {
    const currentParams = getCurrentParams();
    const updatedParams = { ...currentParams, ...newParams };
    const newSearchParams = new URLSearchParams(updatedParams);
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  }, [navigate, getCurrentParams]);

  // Remove specific parameters
  const removeParams = useCallback((paramsToRemove: string[]) => {
    const currentParams = getCurrentParams();
    paramsToRemove.forEach(param => delete currentParams[param]);
    const newSearchParams = new URLSearchParams(currentParams);
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  }, [navigate, getCurrentParams]);

  return {
    // Navigation functions
    navigateTo,
    goToDashboard,
    goToCalibration,
    goToStationDetail,
    goToTesterDetail,
    goToFixtureDetail,
    goBack,
    
    // Parameter management
    getCurrentParams,
    updateParams,
    removeParams,
    
    // Route constants
    ROUTES: ROUTE_PATHS
  };
}
