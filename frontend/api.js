// In frontend/src/services/api.js
provisionCompany: (data) => {
  const corsProxyUrl = 'https://cors-anywhere.herokuapp.com/';
  const targetUrl = 'https://emed-onboarding-poc.vercel.app/api/companies/provision';
  
  return axios.post(corsProxyUrl + targetUrl, data, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
}
