import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ProvisioningPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    industry: '',
    size: '',
    primaryContact: {
      name: '',
      email: '',
      phone: ''
    },
    adminUser: {
      name: '',
      email: '',
      title: ''
    },
    planDetails: {
      startDate: '',
      estimatedUsers: '',
      additionalNotes: ''
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [portalInfo, setPortalInfo] = useState(null);
  const [error, setError] = useState(null);

  // ... (rest of your existing methods)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900">eMed GLP-1 Program</h1>
          <p className="mt-2 text-sm text-gray-600">
            Set up your company portal for the GLP-1 Medication Program
          </p>
          
          <div className="mt-4">
            <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              Already have an account? Sign in
            </a>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6 sm:p-8">
          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {!isComplete ? (
            <>
              {renderStepIndicator()}
              
              <div className="mb-8">
                {step === 1 && renderCompanyInfoStep()}
                {step === 2 && renderPrimaryContactStep()}
                {step === 3 && renderAdminUserStep()}
                {step === 4 && renderProgramDetailsStep()}
              </div>
              
              <div className="flex justify-between">
                {step > 1 ? (
                  <button 
                    onClick={handleBack}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Back
                  </button>
                ) : (
                  <div></div>
                )}
                
                {step < 4 ? (
                  <button 
                    onClick={handleNext}
                    disabled={!validateStep(step)}
                    className={`px-4 py-2 rounded text-white flex items-center ${
                      validateStep(step) 
                        ? 'bg-indigo-600 hover:bg-indigo-700' 
                        : 'bg-indigo-300 cursor-not-allowed'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    Next
                    <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !validateStep(step)}
                    className={`px-4 py-2 rounded text-white flex items-center ${
                      isSubmitting || !validateStep(step)
                        ? 'bg-indigo-300 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Portal...
                      </>
                    ) : (
                      'Create Portal'
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            renderCompletionStep()
          )}
        </div>
      </div>
    </div>
  );
};

export default ProvisioningPage;
