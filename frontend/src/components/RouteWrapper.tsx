import { memo } from 'react';
import { useRouteNavigation } from '../hooks/useRouteNavigation';

// Higher-order component to wrap pages with navigation utilities
interface RouteWrapperProps {
  children: React.ReactNode;
}

const RouteWrapper = memo(function RouteWrapper({ children }: RouteWrapperProps) {
  const navigation = useRouteNavigation();
  
  // Provide navigation context to child components
  return (
    <div data-route-wrapper>
      {children}
    </div>
  );
});

export default RouteWrapper;
