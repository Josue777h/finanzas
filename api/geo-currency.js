module.exports = async (req, res) => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return res.json({
      currency: data.currency || 'USD',
      country: data.country_name || '',
    });
  } catch (err) {
    return res.json({ currency: 'USD', country: '' });
  }
};
