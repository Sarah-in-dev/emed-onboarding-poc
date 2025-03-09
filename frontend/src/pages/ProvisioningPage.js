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
  
  // Method to update form data
  const updateFormData = (section, field, value) => {
    if (section) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };
  
  // Validate current step
  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1:
        return formData.companyName && formData.address && formData.industry && formData.size;
      case 2:
        return formData.primaryContact.name && formData.primaryContact.email && formData.primaryContact.phone;
      case 3:
        return formData.adminUser.name && formData.adminUser.email && formData.adminUser.title;
      case 4:
        return formData.planDetails.startDate && formData.planDetails.estimatedUsers;
      default:
        return false;
    }
  };
  
  // Move to next step
  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };
  
  // Go back to previous step
  const handleBack = () => {
    setStep(step - 1);
  };
  
  // Submit form to provision company
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      console.log('Submitting form data:', formData);
      
      // First try using the api service
      try {
        console.log('Attempting to use api.provisionCompany');
        const response = await api.provisionCompany(formData);
        console.log('API response:', response.data);
        
        setPortalInfo(response.data);
        setIsComplete(true);
        setIsSubmitting(false);
        return;
      } catch (apiError) {
        console.error('API service method failed:', apiError);
        // Continue to fallback method
      }
      
      // Fallback to direct fetch if the api method fails
      console.log('Falling back to direct fetch');
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetch response data:', data);
      
      setPortalInfo(data);
      setIsComplete(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Error provisioning company:', err);
      setError(`Failed to provision company portal: ${err.message}`);
      setIsSubmitting(false);
    }
  };
  
  // Copy text to clipboard
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };
  
  // Render step progress indicator
  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((stepNumber) => (
          <React.Fragment key={stepNumber}>
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                stepNumber < step ? 'bg-green-500 text-white' : 
                stepNumber === step ? 'bg-indigo-600 text-white' : 
                'bg-gray-200 text-gray-600'
              }`}
            >
              {stepNumber < step ? (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                stepNumber
              )}
            </div>
            {stepNumber < 4 && (
              <div 
                className={`h-1 w-16 ${
                  stepNumber < step ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };
  
  // Render company information step
  const renderCompanyInfoStep = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center">
          <svg className="h-5 w-5 mr-2 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Company Information
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block mb-1 font-medium">Company Name *</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => updateFormData(null, 'companyName', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Acme Corporation"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Address *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => updateFormData(null, 'address', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="123 Main St, City, State, ZIP"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Industry *</label>
            <select
              value={formData.industry}
              onChange={(e) => updateFormData(null, 'industry', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select Industry</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Retail">Retail</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Company Size *</label>
            <select
              value={formData.size}
              onChange={(e) => updateFormData(null, 'size', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select Size</option>
              <option value="1-50">1-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="501-1000">501-1000 employees</option>
              <option value="1001+">1001+ employees</option>
            </select>
          </div>
        </div>
      </div>
    );
  };
  
  // Render primary contact step
  const renderPrimaryContactStep = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center">
          <svg className="h-5 w-5 mr-2 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Primary Contact Information
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block mb-1 font-medium">Full Name *</label>
            <input
              type="text"
              value={formData.primaryContact.name}
              onChange={(e) => updateFormData('primaryContact', 'name', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Email *</label>
            <input
              type="email"
              value={formData.primaryContact.email}
              onChange={(e) => updateFormData('primaryContact', 'email', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="john.doe@company.com"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Phone Number *</label>
            <input
              type="tel"
              value={formData.primaryContact.phone}
              onChange={(e) => updateFormData('primaryContact', 'phone', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="(555) 123-4567"
              required
            />
          </div>
        </div>
      </div>
    );
  };
  
  // Render admin user step
  const renderAdminUserStep = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center">
          <svg className="h-5 w-5 mr-2 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Portal Administrator
        </h2>
        <p className="text-gray-500 mb-3">
          This person will be the main administrator for your company's GLP-1 program portal.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block mb-1 font-medium">Admin Name *</label>
            <input
              type="text"
              value={formData.adminUser.name}
              onChange={(e) => updateFormData('adminUser', 'name', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Admin Email *</label>
            <input
              type="email"
              value={formData.adminUser.email}
              onChange={(e) => updateFormData('adminUser', 'email', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="jane.smith@company.com"
              required
            />
            <p className="text-sm text-gray-500 mt-1">Login credentials will be sent to this email</p>
          </div>
          <div>
            <label className="block mb-1 font-medium">Job Title *</label>
            <input
              type="text"
              value={formData.adminUser.title}
              onChange={(e) => updateFormData('adminUser', 'title', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="HR Manager"
              required
            />
          </div>
        </div>
      </div>
    );
  };
  
  // Render program details step
  const renderProgramDetailsStep = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center">
          <svg className="h-5 w-5 mr-2 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        GLP-1 Program Details
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block mb-1 font-medium">Planned Start Date *</label>
          <input
            type="date"
            value={formData.planDetails.startDate}
            onChange={(e) => updateFormData('planDetails', 'startDate', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Estimated Number of Participants *</label>
          <input
            type="number"
            value={formData.planDetails.estimatedUsers}
            onChange={(e) => updateFormData('planDetails', 'estimatedUsers', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="100"
            min="1"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Additional Notes</label>
          <textarea
            value={formData.planDetails.additionalNotes}
            onChange={(e) => updateFormData('planDetails', 'additionalNotes', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
            placeholder="Any specific requirements or information about your program"
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Render completion step
const renderCompletionStep = () => {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold">Your Portal is Ready!</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Your company admin portal has been successfully created and is ready to use.
      </p>
      
      <div className="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
        <div className="mb-3">
          <p className="text-sm text-gray-500">Portal URL</p>
          <div className="flex items-center justify-between bg-white p-2 rounded border">
            <span className="font-medium">{portalInfo?.portalUrl || "URL not available"}</span>
            <button 
              onClick={() => handleCopyToClipboard(portalInfo?.portalUrl)}
              className="text-indigo-600 text-sm"
            >
              Copy
            </button>
          </div>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-gray-500">Admin Email</p>
          <div className="flex items-center justify-between bg-white p-2 rounded border">
            <span>{portalInfo?.credentials?.email || "Email not available"}</span>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Temporary Password</p>
          <div className="flex items-center justify-between bg-white p-2 rounded border">
            <span>{portalInfo?.credentials?.tempPassword || "Password not available"}</span>
            <button 
              onClick={() => handleCopyToClipboard(portalInfo?.credentials?.tempPassword)}
              className="text-indigo-600 text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-gray-500 mb-2">
          We've sent these details to the admin email address provided.
        </p>
        <a 
          href="/login" 
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go to Portal
          <svg className="ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>
    </div>
  );
};

// Return the full JSX for the component
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
