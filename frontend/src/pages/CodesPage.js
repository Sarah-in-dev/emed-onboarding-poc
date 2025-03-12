import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const CodesPage = () => {
  // Check if in demo mode
  const isDemoMode = localStorage.getItem('token')?.startsWith('demo-token') || false;
  
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [generationForm, setGenerationForm] = useState({
    quantity: 50,
    notes: ''
  });
  
  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await api.getCodeBatches();
      setBatches(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching code batches:', err);
      setError('Failed to load code batches');
      setLoading(false);
    }
  };
  
  const fetchCodes = async (batchId) => {
    try {
      setLoading(true);
      const response = await api.getCodes(batchId);
      setCodes(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching codes:', err);
      setError('Failed to load codes');
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBatches();
  }, []);
  
  const handleGenerateCodes = async (e) => {
    e.preventDefault();
    
    try {
      setGeneratingCodes(true);
      const response = await api.generateCodes(generationForm.quantity, generationForm.notes);
      
      // Add the new batch to the list and select it
      if (isDemoMode) {
        // In demo mode, manually update the state
        const newBatch = {
          batch_id: Date.now(), // Use timestamp as ID
          notes: generationForm.notes || `Batch ${new Date().toLocaleDateString()}`,
          quantity: generationForm.quantity,
          created_at: new Date().toISOString(),
          active_count: generationForm.quantity,
          used_count: 0,
          expired_count: 0
        };
        
        setBatches([newBatch, ...batches]);
        setSelectedBatch(newBatch.batch_id);
        setCodes(response.data.codes || []);
      } else {
        // Regular API flow
        fetchBatches();
        setSelectedBatch(response.data.batch_id);
        setCodes(response.data.codes.map(code => ({ code })));
      }
      
      // Reset the form
      setGenerationForm({
        quantity: 50,
        notes: ''
      });
      
      setGeneratingCodes(false);
    } catch (err) {
      console.error('Error generating codes:', err);
      setError('Failed to generate codes');
      setGeneratingCodes(false);
    }
  };
  
  const handleBatchSelect = (batchId) => {
    setSelectedBatch(batchId);
    fetchCodes(batchId);
  };
  
  const handleDownloadCodes = () => {
    if (!codes.length) return;
    
    const csvContent = "data:text/csv;charset=utf-8," + codes.map(c => c.code).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // Get batch info for the filename
    const batch = batches.find(b => b.batch_id === selectedBatch);
    const batchDate = batch ? new Date(batch.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    link.setAttribute("download", `enrollment_codes_${batchDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Enrollment Codes</h1>
        
        {isDemoMode && (
          <div className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200">
            Demo Mode
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Code generation form */}
        <div className="md:col-span-1">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Generate Codes</h3>
            </div>
            <form onSubmit={handleGenerateCodes} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    Number of Codes
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="1"
                    max="1000"
                    value={generationForm.quantity}
                    onChange={(e) => setGenerationForm({...generationForm, quantity: parseInt(e.target.value) || 1})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    id="notes"
                    name="notes"
                    value={generationForm.notes}
                    onChange={(e) => setGenerationForm({...generationForm, notes: e.target.value})}
                    placeholder="e.g., Q1 2023 Enrollment"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={generatingCodes}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {generatingCodes ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : 'Generate Codes'}
                </button>
              </div>
            </form>
          </div>
          
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Previous Batches</h3>
            </div>
            {loading && batches.length === 0 ? (
              <div className="text-center py-6">
                <svg className="animate-spin h-6 w-6 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2 text-sm text-gray-500">Loading batches...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {batches && batches.length > 0 ? (
                  batches.map((batch) => (
                    <button
                      key={batch.batch_id}
                      onClick={() => handleBatchSelect(batch.batch_id)}
                      className={`w-full text-left px-6 py-4 hover:bg-gray-50 focus:outline-none ${
                        selectedBatch === batch.batch_id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {batch.notes || `Batch #${batch.batch_id}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(batch.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{batch.quantity}</p>
                          <p className="text-xs text-gray-500">codes</p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-green-600">{batch.active_count || 0} active</span>
                        <span className="text-blue-600">{batch.used_count || 0} used</span>
                        <span className="text-gray-600">{batch.expired_count || 0} expired</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-4 text-center text-sm text-gray-500">
                    No code batches generated yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Code list */}
        <div className="md:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedBatch
                  ? `Codes for Batch #${selectedBatch}`
                  : 'Select a Batch to View Codes'}
              </h3>
              
              {codes && codes.length > 0 && (
                <button
                  onClick={handleDownloadCodes}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </button>
              )}
            </div>
            
            {selectedBatch ? (
              loading ? (
                <div className="text-center py-10">
                  <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-3 text-gray-600">Loading codes...</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {codes && codes.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Code
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {codes.map((code, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-mono text-gray-900">{code.code}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                code.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : code.status === 'used'
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-800'
                              }`}>
                                {code.status || 'active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-4 text-center text-sm text-gray-500">
                      No codes available for this batch
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="px-6 py-10 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-sm">Select a batch from the list or generate new codes</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Demo mode information */}
      {isDemoMode && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Demo Information</h3>
          <p className="text-sm text-gray-600">
            This is a demonstration of the enrollment codes management page. You can generate new batches of 
            enrollment codes, view existing code batches, and export codes as CSV.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            In a production environment, these codes would be used by your employees to 
            enroll in the GLP-1 medication program.
          </p>
        </div>
      )}
    </Layout>
  );
};

export default CodesPage;
