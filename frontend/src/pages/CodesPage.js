// In CodesPage.js, add this near the top of the component:
const isDemoMode = localStorage.getItem('token')?.startsWith('demo-token') || false;

// Then update the handleGenerateCodes function:
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
        notes: generationForm.notes,
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
