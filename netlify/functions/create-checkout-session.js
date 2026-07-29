const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const symbol = body.symbol || 'UNKNOWN';
    const quantity = parseInt(body.quantity || 1);
    const price = parseFloat(body.price || 0.0);
    const amountInPaise = Math.round(quantity * price * 100);

    if (amountInPaise <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid transaction amount.' })
      };
    }

    const host = event.headers.host || 'localhost:8000';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const formattedTotal = `INR ${(quantity * price).toFixed(2)}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Buy ${quantity} shares of ${symbol}`,
              description: `Dynamic stock transaction in test mode. Rate: INR ${price.toFixed(2)}/share. Total: {formattedTotal}.`,
            },
            unit_amount: amountInPaise,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        symbol: symbol,
        quantity: String(quantity),
        price: String(price),
        type: 'buy'
      },
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancel`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, url: session.url })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
