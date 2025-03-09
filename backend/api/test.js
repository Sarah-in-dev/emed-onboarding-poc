module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ message: 'Test endpoint works!', timestamp: new Date().toISOString() });
};
