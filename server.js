
import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Simple in-memory cache (ephemeral - use only for per-request caching)
  const serverCache = new Map();

  const getCachedData = (key) => {
    const item = serverCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      serverCache.delete(key);
      return null;
    }
    return item.value;
  };

  const setCachedData = (key, value, ttl = 3600000) => {
    serverCache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  };

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.VITE_API_BASE_URL || 'http://localhost:3000'
    ],
    credentials: true
  }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Image Upload Endpoint
  app.post('/api/upload', async (req, res) => {
    try {
      const { file } = req.body;
      if (!file) {
        return res.status(400).json({ error: 'No image file data received' });
      }

      const apiKey = process.env.IMG_HOSTING_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'IMG_HOSTING_API_KEY not configured' });
      }

      const base64Data = file.includes('base64,') ? file.split('base64,')[1] : file;
      const buffer = Buffer.from(base64Data, 'base64');

      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', buffer, 'upload.jpg');

      const resp = await fetch('https://api.imghosting.in/upload', {
        method: 'POST',
        headers: { 'X-Free-API-Key': apiKey },
        body: form
      });

      if (resp.ok) {
        const result = await resp.json();
        return res.json({ url: result.url || result.data?.url || result.image?.url });
      }

      const errText = await resp.text();
      res.status(502).json({ error: `Upload failed (${resp.status}): ${errText}` });
    } catch (error) {
      console.error('Upload Error:', error);
      res.status(500).json({ error: error.message || 'Error uploading image' });
    }
  });

  // Helper to create appropriate transporter based on email provider
  const buildTransporter = (user, pass) => {
    if (user && user.includes('zoho')) {
      return nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        connectionTimeout: 5000,
        socketTimeout: 5000,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      });
    }
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  };

  // Configure Nodemailer Transporter
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER and EMAIL_PASS must be set in environment variables for email to work');
  }

  const defaultTransporter = buildTransporter(
    process.env.EMAIL_USER || '',
    process.env.EMAIL_PASS || ''
  );

  const getTransporter = (req) => {
    const user = req.body?.smtpUser || req.query?.smtpUser || process.env.EMAIL_USER;
    const pass = req.body?.smtpPass || req.query?.smtpPass || process.env.EMAIL_PASS;

    if (!user || !pass) {
      throw new Error('Email credentials not configured. Set EMAIL_USER and EMAIL_PASS environment variables.');
    }

    // If using default credentials, reuse the compiled defaultTransporter
    const defaultUser = process.env.EMAIL_USER;
    const defaultPass = process.env.EMAIL_PASS;
    if (user === defaultUser && pass === defaultPass) {
      return { transporter: defaultTransporter, user };
    }

    // Otherwise, dynamically spin up a Nodemailer transporter for manual overrides
    return {
      transporter: buildTransporter(user, pass),
      user
    };
  };

  // Test email endpoint (handles GET and POST for convenience)
  app.all('/api/test-email', async (req, res) => {
    try {
      const { transporter, user } = getTransporter(req);
      const targetAdmin = req.body?.adminEmail || req.query?.adminEmail || process.env.ADMIN_EMAIL;
      
      const mailOptions = {
        from: `"Greyton Go Test" <${user}>`,
        to: targetAdmin,
        subject: 'Greyton Go - System Test Email',
        text: 'This is a test email to verify your Nodemailer configuration is working correctly. If you received this, your App Password is set up correctly!'
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "Test email sent successfully!" });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/cache-test', (req, res) => {
    const cacheKey = 'time_test';
    const cachedTime = getCachedData(cacheKey);
    
    if (cachedTime) {
      return res.json({ time: cachedTime, source: 'cache' });
    }
    
    const newTime = new Date().toISOString();
    setCachedData(cacheKey, newTime, 10000); // 10 seconds
    res.json({ time: newTime, source: 'server' });
  });

  // Unified API endpoint for orders
  app.post('/api/order', async (req, res) => {
    const { details, cart, total, restaurantEmail, driverEmail } = req.body;
    const orderRef = `GG-${Date.now().toString().slice(-6)}`;

    console.log(`Processing Order ${orderRef} for ${details.name}`);

    // Resolve SMTP transporter from local settings or process variables
    let resolvedTransporter;
    let resolvedUser;
    try {
      const { transporter, user } = getTransporter(req);
      resolvedTransporter = transporter;
      resolvedUser = user;
    } catch (err) {
      console.warn('Falling back to default transporter configuration:', err.message);
      resolvedTransporter = defaultTransporter;
      resolvedUser = process.env.EMAIL_USER || 'no-reply@greytongo.co.za';
    }

    const groupedItems = cart.reduce((acc, item) => {
      const restaurant = item.restaurantName || req.body.restaurantName || 'Greyton Go';
      if (!acc[restaurant]) acc[restaurant] = [];
      acc[restaurant].push(item);
      return acc;
    }, {});

    const orderList = Object.entries(groupedItems).map(([restaurant, items]) => {
      const itemsList = items.map(item => {
        const mods = Object.entries(item.selectedModifiers || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
        return `• ${item.quantity}x ${item.menuItem.name} ${mods ? `(${mods})` : ''} - R${item.totalPrice}`;
      }).join('\n');
      return `FROM: ${restaurant}\n${itemsList}`;
    }).join('\n\n');

    const subtotal = Number(req.body.subtotal) || (Number(total) - 35);
    const deliveryFee = Number(req.body.deliveryFee) || 35;
    const grandTotal = Number(req.body.total) || (subtotal + deliveryFee);
    const paymentMethod = req.body.paymentMethod || 'cash';
    const restName = req.body.restaurantName || 'Greyton Go';
    const isOkMiniMark = restName?.toLowerCase().includes("ok mini") || restName?.toLowerCase().includes("minimark") || restName?.toLowerCase().includes("okmini") || restName?.toLowerCase().includes("mini mark");
    const commission = isOkMiniMark ? 0 : subtotal * 0.15;

    // Use adminEmail from frontend payload as preferred target if present
    const finalAdminTarget = req.body.adminEmail || process.env.ADMIN_EMAIL;

    // 1. Admin Email
    const chefMailOptions = {
      from: `"Greyton Go Orders" <${resolvedUser}>`,
      to: finalAdminTarget,
      subject: `New Order Received - ${orderRef}`,
      text: `
New order received via Greyton Go

Customer: ${details.name} (${details.phone})

Address: ${details.address || 'N/A'}

ITEMS:
${orderList}

FINANCIALS:
Subtotal: R${subtotal.toFixed(2)}
Delivery: R${deliveryFee.toFixed(2)}
Total: R${grandTotal.toFixed(2)}
Commission (15%): R${commission.toFixed(2)}
Payment Method: ${paymentMethod === 'payshap' ? 'PayShap (Cell: 072996050, Alias: Chaos Catering)' : 'Cash Payment on Delivery'}
      `
    };

    const restaurantNames = Object.keys(groupedItems).join(' & ');

    // payment-specific instruction block for customer email HTML
    const paymentInstructionHtml = paymentMethod === 'payshap' ? `
      <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">Please pay instantly via your banking app using <strong>PayShap</strong> with the details below:</p>
      <div style="background-color: #f0fdf4; color: #166534; padding: 18px 24px; border-radius: 8px; font-weight: bold; display: inline-block; border: 1px solid #bbf7d0; text-align: left; font-size: 14px; margin-bottom: 10px; width: 85%;">
        <div style="margin-bottom: 6px;">📱 PayShap Cell No: <span style="font-family: monospace; font-size: 15px; color: #14532d;">072996050</span></div>
        <div>👤 Registered Alias: <span style="color: #14532d;">Chaos Catering</span></div>
      </div>
      <p style="margin-top: 10px; font-size: 11px; color: #16a34a; font-style: italic;">Kindly complete the transfer before the driver arrives with your delivery.</p>
    ` : `
      <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">Please prepare to pay in <strong>cash</strong> upon delivery.</p>
      <div style="background-color: #f1f5f9; color: #475569; padding: 16px 32px; border-radius: 8px; font-weight: bold; display: inline-block; border: 1px solid #e2e8f0;">Cash Payment on Delivery</div>
    `;

    // 2. Customer Email
    const customerMailOptions = {
      from: `"Greyton Go" <${resolvedUser}>`,
      to: details.email,
      subject: `Your Order Receipt from Greyton Go - ${orderRef}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-family: serif;">Greyton Go</h1>
            <p style="margin: 5px 0 0; opacity: 0.8; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">Premium Village Delivery</p>
          </div>
          <div style="padding: 40px;">
            <h2 style="margin-top: 0; color: #1e293b;">Thank you for your order, ${details.name}!</h2>
            <p style="color: #64748b; line-height: 1.6;">We've sent your order to <strong>${restaurantNames}</strong>. Here is your receipt:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Order Reference</p>
              <p style="margin: 5px 0 15px; font-size: 18px; font-weight: bold; color: #1e293b;">${orderRef}</p>
              
              <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Restaurant(s)</p>
              <p style="margin: 5px 0 15px; font-size: 16px; font-weight: bold; color: #1e293b;">${restaurantNames}</p>
 
              <pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 10px;">${orderList}</pre>
              
              <div style="border-top: 1px solid #cbd5e1; margin-top: 15px; padding-top: 15px;">
                <table style="width: 100%; font-size: 14px; color: #475569; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 4px 0;">Subtotal:</td>
                    <td style="text-align: right; padding: 4px 0;">R${subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Delivery Fee:</td>
                    <td style="text-align: right; padding: 4px 0;">R${deliveryFee.toFixed(2)}</td>
                  </tr>
                  <tr style="font-weight: bold; font-size: 18px; color: #115e59;">
                    <td style="padding: 10px 0 4px;">Total Amount Due:</td>
                    <td style="text-align: right; padding: 10px 0 4px;">R${grandTotal.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
            </div>
 
            <div style="text-align: center; margin-top: 35px;">
              ${paymentInstructionHtml}
              <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">Questions? Call us at 0729936050</p>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
            Greyton Go • Village Delivery Service • Greyton, South Africa
          </div>
        </div>
      `
    };

    // 3. Restaurant Email (Optional)
    const restaurantMailOptions = restaurantEmail ? {
      from: `"Greyton Go Orders" <${resolvedUser}>`,
      to: restaurantEmail,
      subject: `NEW ORDER - Greyton Go Delivery (${orderRef})`,
      text: `
KITCHEN ORDER - ${orderRef}

ITEMS:
${orderList}

Special Instructions: ${details.specialInstructions || 'None'}

Please reply to this email to confirm acceptance and provide an estimated collection time.
      `
    } : null;

    // 4. Driver Email (Optional)
    const driverMailOptions = driverEmail ? {
      from: `"Greyton Go Dispatch" <${resolvedUser}>`,
      to: driverEmail,
      subject: `DISPATCH: New Collection at ${restaurantNames} (${orderRef})`,
      text: `
DISPATCH NOTICE - ${orderRef}

Collection From: ${restaurantNames}

Deliver To:
${details.name}
${details.address || 'N/A'}
Phone: ${details.phone}

Please confirm collection in the Driver App once items are received.
      `
    } : null;

    try {
      // Send emails sequentially with a 1-second delay to prevent SMTP concurrent connection spikes
      // which triggers the Zoho / Gmail outbound anti-spam protection.
      
      const sendWithRetry = async (mailOptions, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await resolvedTransporter.sendMail(mailOptions);
          } catch (error) {
            if (attempt === maxRetries) throw error;
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            console.warn(`Email send failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      await sendWithRetry(chefMailOptions);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await sendWithRetry(customerMailOptions);
      
      if (restaurantMailOptions) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendWithRetry(restaurantMailOptions);
      }
      
      if (driverMailOptions) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendWithRetry(driverMailOptions);
      }
      
      res.status(200).json({ 
        message: "Order placed and emails sent!",
        orderId: orderRef 
      });
    } catch (error) {
      console.error('Email error:', error);
      let errorMsg = error.message;
      if (errorMsg.includes('550 5.4.6') || errorMsg.includes('Unusual sending activity')) {
        errorMsg = "Zoho Mail outbound restriction. Action Required: Please log in to your Zoho Mail inbox at mail.zoho.com and look for the unblock warning banner/link at the top of the screen to verify your account and resume delivery dispatches.";
      }
      res.status(200).json({ 
        message: `Order logged (Email issue: ${errorMsg})`, 
        orderId: orderRef, 
        error: true 
      });
    }
  });

  // Proforma Invoice for Grocery Stores
  app.post('/api/proforma-invoice', async (req, res) => {
    const { order } = req.body;
    if (!order || !order.customerEmail) {
      return res.status(400).json({ error: 'Missing order details or customer email' });
    }

    let resolvedTransporter;
    let resolvedUser;
    try {
      const { transporter, user } = getTransporter(req);
      resolvedTransporter = transporter;
      resolvedUser = user;
    } catch (err) {
      resolvedTransporter = defaultTransporter;
      resolvedUser = process.env.EMAIL_USER || 'no-reply@greytongo.co.za';
    }

    const pickedItems = order.groceryPickedItems || [];
    const pickedItemsRows = pickedItems
      .filter(item => item.picked)
      .map(item => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #334155;"><strong>${item.name}</strong>${item.comment ? `<br/><span style="font-size: 11px; color: #94a3b8; font-style: italic;">* ${item.comment}</span>` : ''}</td>
          <td style="padding: 10px 0; text-align: right; color: #475569;">${item.quantity}</td>
          <td style="padding: 10px 0; text-align: right; color: #0f172a; font-weight: bold;">R${Number(item.price).toFixed(2)}</td>
        </tr>
      `).join('');

    const outOfStockItems = pickedItems.filter(item => !item.picked);
    const outOfStockBlock = outOfStockItems.length > 0 ? `
      <div style="margin: 25px 0; padding: 15px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px;">
        <h4 style="margin: 0 0 8px 0; color: #991b1b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Out of Stock Items (Not billed)</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #7f1d1d;">
          ${outOfStockItems.map(item => `<li>${item.name} (${item.quantity}) - ${item.comment || 'Unavailable'}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    const textPayload = `
Proforma Invoice for Order Reference: ${order.id}
Customer: ${order.customerName}

Picked Items:
${pickedItems.filter(item => item.picked).map(item => `• [PICKED] ${item.quantity}x ${item.name} - R${Number(item.price).toFixed(2)}`).join('\n')}

Unavailable Items:
${pickedItems.filter(item => !item.picked).map(item => `• [OUT OF STOCK] ${item.quantity}x ${item.name}`).join('\n')}

Financials:
Picked Subtotal: R${order.subtotal.toFixed(2)}
Delivery Fee: R${order.deliveryFee.toFixed(2)}
Service Commission (15%): R${order.commission.toFixed(2)}
Grand Total Due: R${order.total.toFixed(2)}

Payment Method: PayShap (Cell: 072996050, Alias: Chaos Catering)
    `;

    const paymentBlock = `
      <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">Please pay instantly via your banking app using <strong>PayShap</strong> to release your delivery:</p>
      <div style="background-color: #f0fdf4; color: #166534; padding: 18px 24px; border-radius: 8px; font-weight: bold; display: inline-block; border: 1px solid #bbf7d0; text-align: left; font-size: 14px; margin-bottom: 10px; width: 85%;">
        <div style="margin-bottom: 6px;">📱 PayShap Cell No: <span style="font-family: monospace; font-size: 15px; color: #14532d;">072996050</span></div>
        <div>👤 Registered Alias: <span style="color: #14532d;">Chaos Catering</span></div>
      </div>
      <p style="margin-top: 10px; font-size: 11px; color: #16a34a; font-style: italic;">Kindly complete the transfer to dispatch your packed grocery order immediately.</p>
    `;

    const mailOptions = {
      from: `"Greyton Go - Grocery Services" <${resolvedUser}>`,
      to: order.customerEmail,
      subject: `PROFORMA INVOICE: Grocery Order Picked! Reference ${order.id}`,
      text: textPayload,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-family: serif;">Greyton Go</h1>
            <p style="margin: 5px 0 0; opacity: 0.8; text-transform: uppercase; letter-spacing: 2px; font-size: 11px;">Official Retail Grocery Picker & Proforma Invoice</p>
          </div>
          <div style="padding: 40px;">
            <h2 style="margin-top: 0; color: #1e293b;">Proforma Payment Request</h2>
            <p style="color: #64748b; line-height: 1.6;">Hi ${order.customerName || 'Customer'},</p>
            <p style="color: #64748b; line-height: 1.6;">Our professional picker has compiled your custom grocery list from <strong>${order.restaurantName}</strong>. Below is the list of products picked, out-of-stock items, and the pricing summary:</p>

            <div style="margin: 25px 0;">
              <h3 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Picked Items</h3>
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                 <thead>
                   <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b;">
                     <th style="padding: 8px 0;">Item</th>
                     <th style="padding: 8px 0; text-align: right;">Qty</th>
                     <th style="padding: 8px 0; text-align: right;">Price</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${pickedItemsRows || '<tr><td colspan="3" style="padding:10px 0; text-align:center;">No items picked successfully.</td></tr>'}
                 </tbody>
              </table>
            </div>

            ${outOfStockBlock}

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Order Reference</p>
              <p style="margin: 3px 0 15px; font-size: 16px; font-weight: bold; color: #1e293b;">${order.id}</p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
                <tr>
                  <td style="padding: 4px 0;">Grocery Picked Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold;">R${order.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Service Commission (15%):</td>
                  <td style="padding: 4px 0; text-align: right;">R${order.commission.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Delivery Fee:</td>
                  <td style="padding: 4px 0; text-align: right;">R${order.deliveryFee.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px dashed #ced4da;">
                  <td style="padding: 8px 0 0; font-weight: bold; font-size: 15px; color: #0f172a;">Grand Total:</td>
                  <td style="padding: 8px 0 0; text-align: right; font-weight: bold; font-size: 15px; color: #0f172a;">R${order.total.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <h3 style="color: #0f172a; margin-top: 30px; font-size: 14px;">Instant Payment for Dispatch</h3>
            ${paymentBlock}

            <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center;">Greyton Go Store Picker Service • Making village shopping seamless.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
            Greyton Go • Village Delivery Service • Greyton, South Africa
          </div>
        </div>
      `
    };

    try {
      await resolvedTransporter.sendMail(mailOptions);
      res.status(200).json({ message: "Proforma invoice sent successfully!" });
    } catch (error) {
      console.error('Proforma invoice error:', error);
      res.status(500).json({ error: error.message || 'Error occurred while sending email.' });
    }
  });

  // Sync endpoint for persistent data
  app.post('/api/sync', async (req, res) => {
    try {
      const { key, data, timestamp, version } = req.body;

      if (!key || !data) {
        return res.status(400).json({ error: 'Missing key or data' });
      }

      // Get cached version of this data if it exists
      const cacheKey = `sync_${key}`;
      const cachedData = getCachedData(cacheKey);

      if (cachedData && cachedData.version > version) {
        // Server has a newer version
        return res.status(409).json({
          conflict: true,
          serverValue: cachedData.value,
          message: 'Data conflict - server has newer version'
        });
      }

      // Update server cache
      setCachedData(cacheKey, { value: data, version, timestamp }, 30 * 24 * 60 * 60 * 1000);

      res.json({
        success: true,
        id: `${key}_${version}`,
        synced: true,
        message: 'Data synced successfully'
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  // Backup sync for critical data (called before page unload)
  app.post('/api/sync-backup', async (req, res) => {
    try {
      const items = req.body || [];
      
      // Store backup of all pending changes
      items.forEach(([key, item]) => {
        const cacheKey = `backup_${key}_${item.version}`;
        setCachedData(cacheKey, item, 7 * 24 * 60 * 60 * 1000);
      });

      res.json({
        success: true,
        message: `Backed up ${items.length} items`,
        backupId: `backup_${Date.now()}`
      });
    } catch (error) {
      console.error('Backup sync error:', error);
      res.status(500).json({ error: 'Backup failed' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
