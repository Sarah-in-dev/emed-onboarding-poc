import React, { useState } from 'react';
import api from '../services/api';

const EnrollmentPage = () => {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [codeValidated, setCodeValidated] = useState(false);
  const [programInfo, setProgramInfo] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [enrollmentInfo, setEnrollmentInfo] = useState(null);
  
  const handleCodeValidation = async (e) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter an enrollment code');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.validateCode(code.trim());
      
      if (response.data.valid) {
        setCodeValidated(true);
        setProgramInfo(response.data.program);
        setCompanyInfo(response.data.company);
        setStep(2);
      } else {
        setError('Invalid enrollment code');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Code validation error:', err);
      setError(err.response?.data?.message || 'Invalid or expired enrollment code');
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleEnrollment = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.enrollUser({
        code,
        ...formData
      });
      
      setEnrollmentInfo(response.data);
      setEnrollmentSuccess(true);
      setStep(3);
      setLoading(false);
    } catch (err) {
      console.error('Enrollment error:', err);
      setError(err.response?.data?.error || 'Enrollment failed. Please try again.');
      setLoading(false);
    }
  };
  
  const renderCodeStep = () => {
    return (
      <div>
        <div className="text-center mb-8">
          <svg className="mx-auto h-16 w-16 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <h2 className="mt-2 text-xl font-bold text-gray-900">Start Your Enrollment</h2>
          <p className="mt-1 text-sm text-gray-500">
            Enter the enrollment code provided by your employer
          </p>
        </div>
        
        <form onSubmit={handleCodeValidation}>
          <div className="mb-6">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Enrollment Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your enrollment code"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Validating...' : 'Continue'}
          </button>
        </form>
      </div>
    );
  };
  
  const renderFormStep = () => {
    return (
      <div>
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900">
            {companyInfo?.name} - {programInfo?.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Please complete your information to enroll in the program
          </p>
        </div>
        
        <form onSubmit={handleEnrollment}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
		required
              />
            </div>
            
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your full shipping address"
                required
              ></textarea>
              <p className="mt-1 text-sm text-gray-500">
                This is where your test kit and medication will be shipped
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex items-center">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mr-4 text-sm text-indigo-600 hover:text-indigo-500"
            >
              Back
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Enrolling...' : 'Complete Enrollment'}
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  const renderSuccessStep = () => {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="mt-4 text-xl font-bold text-gray-900">Enrollment Successful!</h2>
        <p className="mt-2 text-gray-600">
          Thank you for enrolling in the GLP-1 Medication Program. Your test kit will be shipped to the address you provided.
        </p>
        
        <div className="mt-6 bg-gray-50 p-4 rounded-lg max-w-md mx-auto text-left">
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-700">Name:</p>
            <p className="text-sm text-gray-900">{enrollmentInfo?.name}</p>
          </div>
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-700">Email:</p>
            <p className="text-sm text-gray-900">{enrollmentInfo?.email}</p>
          </div>
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-700">Enrollment Date:</p>
            <p className="text-sm text-gray-900">
              {new Date(enrollmentInfo?.enrollment_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">eMed Identifier:</p>
            <p className="text-sm text-gray-900">{enrollmentInfo?.emed_identifier}</p>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900">What's Next?</h3>
          <ol className="mt-4 text-left max-w-md mx-auto space-y-4">
            <li className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-600">
                  1
                </div>
              </div>
              <p className="ml-3 text-sm text-gray-600">
                You will receive a blood test kit in the mail within 3-5 business days.
              </p>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-600">
                  2
                </div>
              </div>
              <p className="ml-3 text-sm text-gray-600">
                Follow the instructions to complete your blood test and mail it back using the prepaid shipping label.
              </p>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-600">
                  3
                </div>
              </div>
              <p className="ml-3 text-sm text-gray-600">
                A healthcare provider will review your results and determine if GLP-1 medication is right for you.
              </p>
            </li>
            <li className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-600">
                  4
                </div>
              </div>
              <p className="ml-3 text-sm text-gray-600">
                If approved, your medication will be shipped directly to your home.
              </p>
            </li>
          </ol>
        </div>
        
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            If you have any questions, please contact our support team.
          </p>
          
           <a href="mailto:support@emed-care.com"
            className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            Contact Support
          </a>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">eMed GLP-1 Program</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enrollment Portal
          </p>
        </div>
        
        {/* Progress Steps */}
        {!enrollmentSuccess && (
          <div className="mb-8">
            <div className="flex items-center justify-center">
              <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`h-1 w-12 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className={`h-1 w-12 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Enter Code</span>
              <span>Your Info</span>
              <span>Complete</span>
            </div>
          </div>
        )}
        
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {step === 1 && renderCodeStep()}
          {step === 2 && renderFormStep()}
          {step === 3 && renderSuccessStep()}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentPage;
