import { Suspense, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getRouteByPath, getPageMetadata, validateRouteParams } from '../config/routes';
import DynamicLayout from './DynamicLayout';

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <div className="text-slate-300 text-lg font-medium">Loading...</div>
    </div>
  </div>
);

// Error boundary component
const RouteError = ({ error }: { error: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
    <div className="text-center max-w-md">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Route Error</h1>
      <p className="text-slate-400 mb-6">{error}</p>
      <button
        onClick={() => window.location.href = '/'}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
      >
        Go to Dashboard
      </button>
    </div>
  </div>
);

interface RouteHandlerProps {
  children?: React.ReactNode;
}

export default function RouteHandler({ children }: RouteHandlerProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get current route configuration
  const currentRoute = getRouteByPath(location.pathname);
  
  // Convert URLSearchParams to object
  const params = Object.fromEntries(searchParams.entries());
  
  // Update page metadata
  useEffect(() => {
    const { title, description } = getPageMetadata(location.pathname, params);
    document.title = title;
    
    // Update meta description if it exists
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && description) {
      metaDescription.setAttribute('content', description);
    }
  }, [location.pathname, params]);
  
  // Handle route not found
  if (!currentRoute) {
    return (
      <RouteError error={`Route "${location.pathname}" not found. Please check the URL and try again.`} />
    );
  }
  
  // Validate required parameters
  if (!validateRouteParams(currentRoute, params)) {
    const missingParams = currentRoute.requiresParams?.filter(param => !params[param]) || [];
    return (
      <RouteError 
        error={`Missing required parameters: ${missingParams.join(', ')}. Please provide all required parameters.`} 
      />
    );
  }
  
  // Render the component with Suspense for lazy loading
  const Component = currentRoute.component;
  
  return (
    <DynamicLayout>
      <Suspense fallback={<PageLoader />}>
        <Component />
        {children}
      </Suspense>
    </DynamicLayout>
  );
}
