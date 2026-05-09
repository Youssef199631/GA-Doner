import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// This is a Vercel serverless function equivalent of the Express route
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[NOTIFY] Received request for order:', req.body.order?.id);
  const { order, customerEmail, ownerEmail } = req.body;
  
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, OWNER_PHONE_NUMBER, OWNER_EMAIL } = process.env;
  const ownerPhoneNumber = OWNER_PHONE_NUMBER || '+33749018193';
  const targetOwnerEmail = OWNER_EMAIL || SMTP_USER || 'contact@immo-khattabi-conseil.ma';

  console.log('[NOTIFY] Env check:', {
    hasSmtp: !!(SMTP_HOST && SMTP_USER && SMTP_PASS),
    hasTwilio: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER),
    twilioSidLength: TWILIO_ACCOUNT_SID?.length,
    ownerPhone: ownerPhoneNumber
  });

  let emailSent = false;
  let smsSent = false;
  let errors: string[] = [];

  const paymentLabels: Record<string, string> = {
    'counter': 'Espèces / Comptoir',
    'paypal': 'Paypal',
    'wero': 'Wero',
    'revolut': 'Revolut'
  };

  const paymentLabel = paymentLabels[order.paymentMethod] || order.paymentMethod;
  const pickupLabel = order.pickupTime === 'now' ? 'Immédiatement' : 
                      order.pickupTime === '20min' ? 'Dans 20 minutes' : 'Dans 1 heure';

  // 1. Attempt Email Notification
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST as string,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const itemsHtml = order.items.map((item: any) => `
        <li style="margin-bottom: 10px; border-bottom: 1px solid #f9f9f9; padding-bottom: 5px;">
          <strong>${item.quantity}x ${item.name}</strong> - ${item.price.toFixed(2)}€
          ${item.comment ? `<br/><small style="color: #6d071a; font-style: italic;">Note: ${item.comment}</small>` : ''}
        </li>
      `).join('');

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: #fff; color: #333;">
          <div style="background: #6d071a; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">GA Döner & Grill</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Confirmation de Commande #${order.id.slice(-4).toUpperCase()}</p>
          </div>
          <div style="padding: 30px;">
            <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
              <p style="margin: 0 0 10px; font-size: 16px;">Bonjour,</p>
              <p style="margin: 0; font-size: 16px; line-height: 1.5;">Nouvelle commande de <strong>${order.customerName}</strong> (${customerEmail || 'Non spécifié'}).</p>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 25px;">
              <div style="background: #f0fdf4; color: #166534; padding: 8px 15px; border-radius: 25px; font-size: 12px; font-weight: bold; border: 1px solid #bbf7d0;">
                ⏳ RÉCUPÉRATION : ${pickupLabel}
              </div>
              <div style="background: #eff6ff; color: #1e40af; padding: 8px 15px; border-radius: 25px; font-size: 12px; font-weight: bold; border: 1px solid #bfdbfe;">
                💳 PAIEMENT : ${paymentLabel}
              </div>
            </div>

            <h3 style="font-size: 14px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Détails de la commande</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">${itemsHtml}</ul>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 30px; text-align: right; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Montant Total</p>
              <p style="margin: 5px 0 0; font-size: 24px; color: #1e293b; font-weight: 800;">${order.total.toFixed(2)}€</p>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            Ceci est un message automatique de GA Döner & Grill.
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"GA Döner & Grill" <${SMTP_USER}>`,
        to: targetOwnerEmail,
        subject: `🍔 Commande #${order.id.slice(-4).toUpperCase()} - ${order.customerName}`,
        html: emailHtml,
      });
      
      if (customerEmail) {
        await transporter.sendMail({
          from: `"GA Döner & Grill" <${SMTP_USER}>`,
          to: customerEmail,
          subject: `Confirmation de commande - GA Döner & Grill`,
          html: emailHtml.replace(/Nouvelle commande de/g, 'Merci pour votre commande ! Voici le récapitulatif pour'),
        });
      }
      emailSent = true;
    } catch (err: any) {
      console.error('[EMAIL] Error:', err.message);
      errors.push(`Email error: ${err.message}`);
    }
  }

  // 2. Attempt SMS Notification
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    try {
      console.log('[SMS] Initializing Twilio client...');
      
      // Twilio v5+ ESM compatibility
      const twilioLib = (twilio as any).default || twilio;
      const client = typeof twilioLib === 'function' 
        ? twilioLib(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) 
        : new (twilioLib as any)(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      
      const itemsShort = order.items.map((item: any) => `${item.quantity}x ${item.name.substring(0, 15)}`).join(', ');

      const message = `🍔 GA Doner Grill\n` +
                     `CMD #${order.id.slice(-4).toUpperCase()} | ${order.customerName}\n` +
                     `🛒 ${itemsShort}\n` +
                     `💰 Total: ${order.total.toFixed(2)}€\n` +
                     `💳 ${paymentLabel} | 🕒 ${pickupLabel}`;

      console.log('[SMS] Sending to:', ownerPhoneNumber.substring(0, 6) + '...');
      await client.messages.create({ 
        body: message, 
        from: TWILIO_FROM_NUMBER, 
        to: ownerPhoneNumber 
      });
      console.log('[SMS] Success');
      smsSent = true;
    } catch (err: any) {
      console.error('[SMS] Detailed Error:', {
        message: err.message,
        code: err.code,
        status: err.status,
        moreInfo: err.moreInfo
      });
      errors.push(`SMS error: ${err.message}`);
    }
  } else {
    console.warn('[SMS] Config missing:', {
      hasSid: !!TWILIO_ACCOUNT_SID,
      hasToken: !!TWILIO_AUTH_TOKEN,
      hasFrom: !!TWILIO_FROM_NUMBER
    });
  }

  return res.status(200).json({
    success: emailSent || smsSent,
    emailSent,
    smsSent,
    errors: errors.length > 0 ? errors : undefined
  });
}
