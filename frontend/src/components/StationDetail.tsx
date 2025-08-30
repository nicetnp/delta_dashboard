import React from 'react';
import { useParams } from 'react-router-dom';

const StationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Station Detail
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Station ID: {id}
          </h2>
          <p className="text-gray-600">
            This is the station detail page. Content will be implemented based on your requirements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StationDetail;
