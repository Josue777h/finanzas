const { corsHeaders } = require('./_admin');

exports.handler = async (event) => {
  const origin = event.headers.origin || '';
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        currency: data.currency || 'USD',
        country: data.country_name || '',
      }),
    };
  } catch {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ currency: 'USD', country: '' }),
    };
  }
};
