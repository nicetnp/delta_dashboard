import React, { useState, useEffect } from 'react';

interface Calibration {
  ID: number;
  Station: string;
  Equipment: string;
  Brand: string;
  Model: string;
  DT: string;
  StartDate: string;
  EndDate: string;
  LineID: string;
  Comment: string;
  Status: string;
  Seriesnumber: string;
  Responsible: string;
  AssetNumber: string;
}

const CalibrationForm: React.FC = () => {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    Station: '',
    Equipment: '',
    Brand: '',
    Model: '',
    DT: '',
    StartDate: '',
    EndDate: '',
    LineID: '',
    Comment: '',
    Status: '',
    Seriesnumber: '',
    Responsible: '',
    AssetNumber: ''
  });

  const API_URL = "http://127.0.0.1:8000/calibration";

  // Load calibrations
  const loadCalibrations = async () => {
    setLoading(true);
    try {
      const calibrationsData: Calibration[] = [];
      for (let id = 1; id <= 20; id++) {
        try {
          const res = await fetch(`${API_URL}/${id}`);
          if (res.ok) {
            const cal = await res.json();
            calibrationsData.push(cal);
          }
        } catch (error) {
          console.log(`No calibration found for ID ${id}`);
        }
      }
      setCalibrations(calibrationsData);
    } catch (error) {
      console.error('Error loading calibrations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(API_URL + "/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert("Calibration added successfully!");
        // Reset form
        setFormData({
          Station: '',
          Equipment: '',
          Brand: '',
          Model: '',
          DT: '',
          StartDate: '',
          EndDate: '',
          LineID: '',
          Comment: '',
          Status: '',
          Seriesnumber: '',
          Responsible: '',
          AssetNumber: ''
        });
        // Reload data
        loadCalibrations();
      } else {
        alert("Error adding calibration");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert("Error adding calibration");
    } finally {
      setLoading(false);
    }
  };

  // Delete calibration
  const deleteCalibration = async (id: number) => {
    const deleted_by = prompt("Enter your name:");
    if (!deleted_by) return;

    try {
      const res = await fetch(`${API_URL}/${id}?deleted_by=${deleted_by}`, { 
        method: "DELETE" 
      });
      if (res.ok) {
        alert("Calibration deleted successfully!");
        loadCalibrations();
      } else {
        alert("Error deleting calibration");
      }
    } catch (error) {
      console.error('Error deleting calibration:', error);
      alert("Error deleting calibration");
    }
  };

  // Edit calibration
  const editCalibration = (id: number) => {
    alert(`Edit calibration with ID: ${id}`);
    // TODO: Implement edit modal
  };

  useEffect(() => {
    loadCalibrations();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Calibration Management
        </h1>

        {/* Form Create Calibration */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h5 className="text-lg font-medium text-gray-900">Add New Calibration</h5>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Station *
                  </label>
                  <input
                    type="text"
                    name="Station"
                    value={formData.Station}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipment *
                  </label>
                  <input
                    type="text"
                    name="Equipment"
                    value={formData.Equipment}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="Brand"
                    value={formData.Brand}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    name="Model"
                    value={formData.Model}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DT
                  </label>
                  <input
                    type="text"
                    name="DT"
                    value={formData.DT}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="StartDate"
                    value={formData.StartDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="EndDate"
                    value={formData.EndDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Line ID
                  </label>
                  <input
                    type="text"
                    name="LineID"
                    value={formData.LineID}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <input
                    type="text"
                    name="Status"
                    value={formData.Status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Series Number
                  </label>
                  <input
                    type="text"
                    name="Seriesnumber"
                    value={formData.Seriesnumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsible
                  </label>
                  <input
                    type="text"
                    name="Responsible"
                    value={formData.Responsible}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset Number
                  </label>
                  <input
                    type="text"
                    name="AssetNumber"
                    value={formData.AssetNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment
                </label>
                <textarea
                  name="Comment"
                  value={formData.Comment}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Calibration'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Table Calibration */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h5 className="text-lg font-medium text-gray-900">Calibration Records</h5>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Station
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : calibrations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No calibration records found
                    </td>
                  </tr>
                ) : (
                  calibrations.map((cal) => (
                    <tr key={cal.ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cal.ID}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cal.Station}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cal.Equipment}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cal.Model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cal.StartDate?.split("T")[0] || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cal.EndDate?.split("T")[0] || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cal.Status}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => editCalibration(cal.ID)}
                          className="text-yellow-600 hover:text-yellow-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCalibration(cal.ID)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalibrationForm;
