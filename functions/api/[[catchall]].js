// Cloudflare Pages Function — handles all /api/* routes
// Uses Resend for email delivery
// Uses Cloudflare KV for cache (CACHE binding), with in-memory fallback

const inMemoryCache = new Map();

function getCached(key) {
  const item = inMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    inMemoryCache.delete(key);
    return null;
  }
  return item.value;
}

function setCached(key, value, ttl = 3600000) {
  inMemoryCache.set(key, { value, expiry: Date.now() + ttl });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function sendEmail({ from, fromName, to, subject, text, html }) {
  const apiKey = 're_2sBm1cGA_M8G3VjC2hGZt2kLoW6SuwnFp';
  const sender = fromName || 'Greyton Go';
  const body = {
    from: `${sender} <onboarding@resend.dev>`,
    to: [to],
    subject,
    reply_to: from || ''
  };
  if (html) {
    body.html = html;
  } else {
    body.text = text || '';
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Resend error (${resp.status}): ${errText}`);
  }
}

function buildOrderList(cart, restaurantName) {
  const grouped = (cart || []).reduce((acc, item) => {
    const r = item.restaurantName || restaurantName || 'Greyton Go';
    if (!acc[r]) acc[r] = [];
    acc[r].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([r, items]) => {
    const lines = items.map(item => {
      const mods = Object.entries(item.selectedModifiers || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
      return `\u2022 ${item.quantity}x ${item.menuItem.name}${mods ? ` (${mods})` : ''} - R${item.totalPrice}`;
    }).join('\n');
    return `FROM: ${r}\n${lines}`;
  }).join('\n\n');
}

function paymentHtml(method) {
  if (method === 'payshap') {
    return `<p style="color:#64748b;font-size:14px;margin-bottom:20px;">Please pay instantly via your banking app using <strong>PayShap</strong>:</p>
<div style="background-color:#f0fdf4;color:#166534;padding:18px 24px;border-radius:8px;font-weight:bold;display:inline-block;border:1px solid #bbf7d0;text-align:left;font-size:14px;margin-bottom:10px;width:85%;">
<div style="margin-bottom:6px;">PayShap Cell No: <span style="font-family:monospace;font-size:15px;color:#14532d;">072996050</span></div>
<div>Registered Alias: <span style="color:#14532d;">Chaos Catering</span></div></div>
<p style="margin-top:10px;font-size:11px;color:#16a34a;font-style:italic;">Kindly complete the transfer before the driver arrives.</p>`;
  }
  return `<p style="color:#64748b;font-size:14px;margin-bottom:20px;">Please prepare to pay in <strong>cash</strong> upon delivery.</p>
<div style="background-color:#f1f5f9;color:#475569;padding:16px 32px;border-radius:8px;font-weight:bold;display:inline-block;border:1px solid #e2e8f0;">Cash Payment on Delivery</div>`;
}

function orderEmailHtml({ name, orderRef, restaurantNames, orderList, subtotal, deliveryFee, grandTotal, paymentMethod }) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
<div style="background-color:#0f172a;padding:30px;text-align:center;color:white;"><h1 style="margin:0;font-family:serif;">Greyton Go</h1>
<p style="margin:5px 0 0;opacity:0.8;text-transform:uppercase;letter-spacing:2px;font-size:12px;">Premium Village Delivery</p></div>
<div style="padding:40px;"><h2 style="margin-top:0;color:#1e293b;">Thank you for your order, ${name}!</h2>
<p style="color:#64748b;line-height:1.6;">We've sent your order to <strong>${restaurantNames}</strong>. Here is your receipt:</p>
<div style="background-color:#f8fafc;padding:20px;border-radius:8px;margin:25px 0;">
<p style="margin:0;font-size:12px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Order Reference</p>
<p style="margin:5px 0 15px;font-size:18px;font-weight:bold;color:#1e293b;">${orderRef}</p>
<p style="margin:0;font-size:12px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Restaurant(s)</p>
<p style="margin:5px 0 15px;font-size:16px;font-weight:bold;color:#1e293b;">${restaurantNames}</p>
<pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;color:#334155;border-top:1px dashed #cbd5e1;padding-top:15px;margin-top:10px;">${orderList}</pre>
<div style="border-top:1px solid #cbd5e1;margin-top:15px;padding-top:15px;">
<table style="width:100%;font-size:14px;color:#475569;border-collapse:collapse;">
<tr><td style="padding:4px 0;">Subtotal:</td><td style="text-align:right;padding:4px 0;">R${subtotal.toFixed(2)}</td></tr>
<tr><td style="padding:4px 0;">Delivery Fee:</td><td style="text-align:right;padding:4px 0;">R${deliveryFee.toFixed(2)}</td></tr>
<tr style="font-weight:bold;font-size:18px;color:#115e59;"><td style="padding:10px 0 4px;">Total Amount Due:</td><td style="text-align:right;padding:10px 0 4px;">R${grandTotal.toFixed(2)}</td></tr>
</table></div></div>
<div style="text-align:center;margin-top:35px;">${paymentHtml(paymentMethod)}<p style="margin-top:20px;font-size:12px;color:#94a3b8;">Questions? Call us at 0729936050</p></div></div>
<div style="background-color:#f1f5f9;padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Greyton Go \u2022 Village Delivery Service \u2022 Greyton, South Africa</div></div>`;
}

async function handleOrder(req, env) {
  const body = await req.json();
  const { details, cart, total, restaurantEmail, driverEmail, paymentMethod, restaurantName, subtotal, deliveryFee, adminEmail, smtpUser } = body;

  const orderRef = `GG-${Date.now().toString().slice(-6)}`;
  const emailUser = smtpUser || env.EMAIL_USER || 'chaos.cartel.pty@zohomail.com';
  const adminTarget = adminEmail || env.ADMIN_EMAIL || 'chaos.cartel.pty@zohomail.com';

  const orderList = buildOrderList(cart, restaurantName);
  const sub = Number(subtotal) || (Number(total) - 35);
  const delFee = Number(deliveryFee) || 35;
  const grand = Number(total) || (sub + delFee);
  const method = paymentMethod || 'cash';
  const restName = restaurantName || 'Greyton Go';
  const isOkMiniMark = restName?.toLowerCase().includes('ok mini') || restName?.toLowerCase().includes('minimark') || restName?.toLowerCase().includes('okmini') || restName?.toLowerCase().includes('mini mark');
  const commission = isOkMiniMark ? 0 : sub * 0.15;
  const restNames = [...new Set((cart || []).map(i => i.restaurantName || restaurantName || 'Greyton Go'))].join(' & ');

  const adminText = `New order received via Greyton Go

Customer: ${details.name} (${details.phone})
Address: ${details.address || 'N/A'}

ITEMS:
${orderList}

FINANCIALS:
Subtotal: R${sub.toFixed(2)}
Delivery: R${delFee.toFixed(2)}
Total: R${grand.toFixed(2)}
Commission (15%): R${commission.toFixed(2)}
Payment Method: ${method === 'payshap' ? 'PayShap (Cell: 072996050, Alias: Chaos Catering)' : 'Cash Payment on Delivery'}`;

  try {
    await sendEmail({
      from: emailUser,
      fromName: 'Greyton Go Orders',
      to: adminTarget,
      subject: `New Order Received - ${orderRef}`,
      text: adminText
    });

    await sendEmail({
      from: emailUser,
      fromName: 'Greyton Go',
      to: details.email,
      subject: `Your Order Receipt from Greyton Go - ${orderRef}`,
      html: orderEmailHtml({
        name: details.name,
        orderRef,
        restaurantNames: restNames,
        orderList,
        subtotal: sub,
        deliveryFee: delFee,
        grandTotal: grand,
        paymentMethod: method
      })
    });

    if (restaurantEmail) {
      await sendEmail({
        from: emailUser,
        fromName: 'Greyton Go Orders',
        to: restaurantEmail,
        subject: `NEW ORDER - Greyton Go Delivery (${orderRef})`,
        text: `KITCHEN ORDER - ${orderRef}\n\nITEMS:\n${orderList}\n\nSpecial Instructions: ${details.specialInstructions || 'None'}\n\nPlease reply to this email to confirm acceptance and provide an estimated collection time.`
      });
    }

    if (driverEmail) {
      await sendEmail({
        from: emailUser,
        fromName: 'Greyton Go Dispatch',
        to: driverEmail,
        subject: `DISPATCH: New Collection at ${restNames} (${orderRef})`,
        text: `DISPATCH NOTICE - ${orderRef}\n\nCollection From: ${restNames}\n\nDeliver To:\n${details.name}\n${details.address || 'N/A'}\nPhone: ${details.phone}\n\nPlease confirm collection in the Driver App once items are received.`
      });
    }

    return json({ message: 'Order placed and emails sent!', orderId: orderRef });
  } catch (err) {
    console.error('Email error:', err);
    return json({
      message: `Order logged (Email issue: ${err.message})`,
      orderId: orderRef,
      error: true
    });
  }
}

async function handleProformaInvoice(req, env) {
  const { order } = await req.json();
  if (!order || !order.customerEmail) {
    return json({ error: 'Missing order details or customer email' }, 400);
  }

  const emailUser = env.EMAIL_USER || 'chaos.cartel.pty@zohomail.com';

  const pickedItems = order.groceryPickedItems || [];
  const pickedRows = pickedItems.filter(i => i.picked).map(i =>
    `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#334155;"><strong>${i.name}</strong>${i.comment ? `<br/><span style="font-size:11px;color:#94a3b8;font-style:italic;">* ${i.comment}</span>` : ''}</td><td style="padding:10px 0;text-align:right;color:#475569;">${i.quantity}</td><td style="padding:10px 0;text-align:right;color:#0f172a;font-weight:bold;">R${Number(i.price).toFixed(2)}</td></tr>`
  ).join('');

  const oosItems = pickedItems.filter(i => !i.picked);
  const oosBlock = oosItems.length ? `<div style="margin:25px 0;padding:15px;background-color:#fef2f2;border:1px solid #fee2e2;border-radius:8px;"><h4 style="margin:0 0 8px 0;color:#991b1b;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Out of Stock Items (Not billed)</h4><ul style="margin:0;padding-left:20px;font-size:12px;color:#7f1d1d;">${oosItems.map(i => `<li>${i.name} (${i.quantity}) - ${i.comment || 'Unavailable'}</li>`).join('')}</ul></div>` : '';

  const isOkMiniMark = order.restaurantName && (order.restaurantName.toLowerCase().includes('ok mini') || order.restaurantName.toLowerCase().includes('minimark') || order.restaurantName.toLowerCase().includes('okmini') || order.restaurantName.toLowerCase().includes('mini mark'));
  const commissionText = isOkMiniMark ? '' : `Service Commission (15%): R${order.commission.toFixed(2)}\n`;
  const commissionHtmlRow = isOkMiniMark ? '' : `<tr><td style="padding:4px 0;">Service Commission (15%):</td><td style="padding:4px 0;text-align:right;">R${order.commission.toFixed(2)}</td></tr>`;

  const textPayload = `Proforma Invoice for Order Reference: ${order.id}\nCustomer: ${order.customerName}\n\nPicked Items:\n${pickedItems.filter(i => i.picked).map(i => `\u2022 [PICKED] ${i.quantity}x ${i.name} - R${Number(i.price).toFixed(2)}`).join('\n')}\n\nUnavailable Items:\n${oosItems.map(i => `\u2022 [OUT OF STOCK] ${i.quantity}x ${i.name}`).join('\n')}\n\nFinancials:\nPicked Subtotal: R${order.subtotal.toFixed(2)}\nDelivery Fee: R${order.deliveryFee.toFixed(2)}\n${commissionText}Grand Total Due: R${order.total.toFixed(2)}\n\nPayment Method: PayShap (Cell: 072996050, Alias: Chaos Catering)`;

  const htmlPayload = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><div style="background-color:#0f172a;padding:30px;text-align:center;color:white;"><h1 style="margin:0;font-family:serif;">Greyton Go</h1><p style="margin:5px 0 0;opacity:0.8;text-transform:uppercase;letter-spacing:2px;font-size:11px;">Official Retail Grocery Picker & Proforma Invoice</p></div><div style="padding:40px;"><h2 style="margin-top:0;color:#1e293b;">Proforma Payment Request</h2><p style="color:#64748b;line-height:1.6;">Hi ${order.customerName || 'Customer'},</p><p style="color:#64748b;line-height:1.6;">Our professional picker has compiled your custom grocery list from <strong>${order.restaurantName}</strong>. Below is the list of products picked, out-of-stock items, and the pricing summary:</p><div style="margin:25px 0;"><h3 style="color:#0f172a;border-bottom:2px solid #f1f5f9;padding-bottom:8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Picked Items</h3><table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px;"><thead><tr style="border-bottom:1px solid #e2e8f0;color:#64748b;"><th style="padding:8px 0;">Item</th><th style="padding:8px 0;text-align:right;">Qty</th><th style="padding:8px 0;text-align:right;">Price</th></tr></thead><tbody>${pickedRows || '<tr><td colspan="3" style="padding:10px 0;text-align:center;">No items picked successfully.</td></tr>'}</tbody></table></div>${oosBlock}<div style="background-color:#f8fafc;padding:20px;border-radius:8px;margin:25px 0;"><p style="margin:0;font-size:11px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Order Reference</p><p style="margin:3px 0 15px;font-size:16px;font-weight:bold;color:#1e293b;">${order.id}</p><table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;"><tr><td style="padding:4px 0;">Grocery Picked Subtotal:</td><td style="padding:4px 0;text-align:right;font-weight:bold;">R${order.subtotal.toFixed(2)}</td></tr>${commissionHtmlRow}<tr><td style="padding:4px 0;">Delivery Fee:</td><td style="padding:4px 0;text-align:right;">R${order.deliveryFee.toFixed(2)}</td></tr><tr style="border-top:1px dashed #ced4da;"><td style="padding:8px 0 0;font-weight:bold;font-size:15px;color:#0f172a;">Grand Total:</td><td style="padding:8px 0 0;text-align:right;font-weight:bold;font-size:15px;color:#0f172a;">R${order.total.toFixed(2)}</td></tr></table></div><h3 style="color:#0f172a;margin-top:30px;font-size:14px;">Instant Payment for Dispatch</h3><p style="color:#64748b;font-size:14px;margin-bottom:20px;">Please pay instantly via your banking app using <strong>PayShap</strong> to release your delivery:</p><div style="background-color:#f0fdf4;color:#166534;padding:18px 24px;border-radius:8px;font-weight:bold;display:inline-block;border:1px solid #bbf7d0;text-align:left;font-size:14px;margin-bottom:10px;width:85%;"><div style="margin-bottom:6px;">PayShap Cell No: <span style="font-family:monospace;font-size:15px;color:#14532d;">072996050</span></div><div>Registered Alias: <span style="color:#14532d;">Chaos Catering</span></div></div><p style="margin-top:10px;font-size:11px;color:#16a34a;font-style:italic;">Kindly complete the transfer to dispatch your packed grocery order immediately.</p><p style="margin-top:30px;font-size:12px;color:#94a3b8;text-align:center;">Greyton Go Store Picker Service \u2022 Making village shopping seamless.</p></div><div style="background-color:#f1f5f9;padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Greyton Go \u2022 Village Delivery Service \u2022 Greyton, South Africa</div></div>`;

  try {
    await sendEmail({
      from: emailUser,
      fromName: 'Greyton Go - Grocery Services',
      to: order.customerEmail,
      subject: `PROFORMA INVOICE: Grocery Order Picked! Reference ${order.id}`,
      text: textPayload,
      html: htmlPayload
    });
    return json({ message: 'Proforma invoice sent successfully!' });
  } catch (err) {
    console.error('Proforma invoice error:', err);
    return json({ error: err.message || 'Error sending email' }, 500);
  }
}

async function handleSync(req, env) {
  const { key, data, timestamp, version } = await req.json();
  if (!key || !data) return json({ error: 'Missing key or data' }, 400);

  if (env.CACHE) {
    const existing = await env.CACHE.get(`sync_${key}`, 'json');
    if (existing && existing.version > version) {
      return json({ conflict: true, serverValue: existing.value, message: 'Data conflict - server has newer version' }, 409);
    }
    await env.CACHE.put(`sync_${key}`, JSON.stringify({ value: data, version, timestamp }), { expirationTtl: 2592000 });
  } else {
    const cacheKey = `sync_${key}`;
    const cached = getCached(cacheKey);
    if (cached && cached.version > version) {
      return json({ conflict: true, serverValue: cached.value, message: 'Data conflict - server has newer version' }, 409);
    }
    setCached(cacheKey, { value: data, version, timestamp }, 30 * 24 * 60 * 60 * 1000);
  }

  return json({ success: true, id: `${key}_${version}`, synced: true, message: 'Data synced successfully' });
}

async function handleSyncBackup(req) {
  const items = await req.json();
  items.forEach(([key, item]) => {
    setCached(`backup_${key}_${item.version}`, item, 7 * 24 * 60 * 60 * 1000);
  });
  return json({ success: true, message: `Backed up ${items.length} items`, backupId: `backup_${Date.now()}` });
}

async function handleUpload(req, env) {
  const { file } = await req.json();
  if (!file) return json({ error: 'No image file data received' }, 400);

  const apiKey = env.IMG_HOSTING_API_KEY;
  if (!apiKey) return json({ error: 'IMG_HOSTING_API_KEY not configured' }, 500);

  const base64Data = file.includes('base64,') ? file.split('base64,')[1] : file;
  const binary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  const blob = new Blob([binary], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('file', blob, 'upload.jpg');

  const resp = await fetch('https://api.imghosting.in/upload', {
    method: 'POST',
    headers: { 'X-Free-API-Key': apiKey },
    body: formData
  });

  if (resp.ok) {
    const result = await resp.json();
    return json({ url: result.url || result.data?.url || result.image?.url });
  }

  const errText = await resp.text();
  return json({ error: `Upload failed (${resp.status}): ${errText}` }, 502);
}

function handleCacheTest(req, env) {
  const cacheKey = 'time_test';

  if (env.CACHE) {
    // KV-based cache check would need async
  }

  const cached = getCached(cacheKey);
  if (cached) return json({ time: cached, source: 'cache' });

  const newTime = new Date().toISOString();
  setCached(cacheKey, newTime, 10000);
  return json({ time: newTime, source: 'server' });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let response;

    if (path.endsWith('/order') && request.method === 'POST') {
      response = await handleOrder(request, env);
    } else if (path.endsWith('/proforma-invoice') && request.method === 'POST') {
      response = await handleProformaInvoice(request, env);
    } else if (path.endsWith('/sync') && request.method === 'POST') {
      response = await handleSync(request, env);
    } else if (path.endsWith('/sync-backup') && request.method === 'POST') {
      response = await handleSyncBackup(request);
    } else if (path.endsWith('/upload') && request.method === 'POST') {
      response = await handleUpload(request, env);
    } else if (path.endsWith('/cache-test') && request.method === 'GET') {
      response = handleCacheTest(request, env);
    } else if (path.endsWith('/test-email')) {
      response = await handleTestEmail(request, env);
    } else {
      response = json({ error: 'Not found' }, 404);
    }

    // Add CORS headers to response
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
    return new Response(response.body, { status: response.status, headers: newHeaders, statusText: response.statusText });
  } catch (err) {
    console.error('API Error:', err);
    const newHeaders = new Headers({ 'Content-Type': 'application/json', ...corsHeaders });
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: newHeaders });
  }
}

async function handleTestEmail(req, env) {
  const body = req.method === 'GET' ? Object.fromEntries(new URL(req.url).searchParams) : await req.json().catch(() => ({}));
  const emailUser = body.smtpUser || env.EMAIL_USER || 'chaos.cartel.pty@zohomail.com';
  const adminTarget = body.adminEmail || env.ADMIN_EMAIL || 'chaos.cartel.pty@zohomail.com';

  await sendEmail({
    from: emailUser,
    fromName: 'Greyton Go Test',
    to: adminTarget,
    subject: 'Greyton Go - System Test Email',
    text: 'This is a test email to verify your email configuration is working correctly.'
  });

  return json({ message: 'Test email sent successfully!' });
}
