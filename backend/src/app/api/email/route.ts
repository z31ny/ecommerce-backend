import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId, customerName, customerEmail, items, subtotal, delivery, total, address } = body;

        if (!customerEmail || !orderId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const firstName = (customerName || 'Customer').split(' ')[0];

        // Build items HTML
        const itemsHtml = items && items.length > 0
            ? items.map((item: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f0e1e5;">${item.name || item.sku}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e1e5; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e1e5; text-align: right;">${item.price} EGP</td>
        </tr>
      `).join('')
            : '<tr><td colspan="3" style="padding: 12px;">Order items will be confirmed</td></tr>';

        const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #FFE5E9;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f4c2ca 0%, #ec9fa9 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #6c2b47; font-size: 28px;">🎉 Order Confirmed!</h1>
          <p style="margin: 10px 0 0; color: #7a2f43;">Thank you for your order, ${firstName}!</p>
        </div>
        
        <!-- Order Number -->
        <div style="background: #fff; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #8a6a74; font-size: 14px;">Order Number</p>
          <p style="margin: 5px 0 0; color: #c45360; font-size: 24px; font-weight: bold;">#${orderId}</p>
        </div>
        
        <!-- Items -->
        <div style="background: #fff; padding: 20px;">
          <h2 style="margin: 0 0 15px; color: #6c2b47; font-size: 18px;">Your Order</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #fff4f6;">
                <th style="padding: 12px; text-align: left; color: #7a2f43;">Item</th>
                <th style="padding: 12px; text-align: center; color: #7a2f43;">Qty</th>
                <th style="padding: 12px; text-align: right; color: #7a2f43;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
        
        <!-- Totals -->
        <div style="background: #fff; padding: 20px; border-top: 2px dashed #f0e1e5;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #7a2f43;">Subtotal</td>
              <td style="padding: 8px 0; text-align: right; color: #7a2f43;">${subtotal || 0} EGP</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #7a2f43;">Delivery</td>
              <td style="padding: 8px 0; text-align: right; color: #7a2f43;">${delivery || 0} EGP</td>
            </tr>
            <tr style="font-size: 18px; font-weight: bold;">
              <td style="padding: 12px 0; color: #c45360;">Total (COD)</td>
              <td style="padding: 12px 0; text-align: right; color: #c45360;">${total || 0} EGP</td>
            </tr>
          </table>
        </div>
        
        <!-- Address -->
        <div style="background: #fff; padding: 20px; border-top: 2px dashed #f0e1e5;">
          <h3 style="margin: 0 0 10px; color: #6c2b47; font-size: 16px;">📍 Delivery Address</h3>
          <p style="margin: 0; color: #7a2f43;">${address || 'Address will be confirmed'}</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #6c2b47; border-radius: 0 0 20px 20px; padding: 25px; text-align: center;">
          <p style="margin: 0 0 10px; color: #fff; font-size: 16px;">💜 Thank you for choosing Freezy Bite!</p>
          <p style="margin: 0; color: #f4c2ca; font-size: 13px;">Payment: Cash on Delivery<br>Our team will contact you to confirm your order.</p>
          <div style="margin-top: 20px;">
            <a href="https://www.instagram.com/freezy_bites_" style="color: #fff; text-decoration: none; margin: 0 10px;">Instagram</a>
            <a href="https://www.tiktok.com/@freezybittes" style="color: #fff; text-decoration: none; margin: 0 10px;">TikTok</a>
            <a href="https://www.facebook.com/share/1R9jBHHhas/" style="color: #fff; text-decoration: none; margin: 0 10px;">Facebook</a>
          </div>
        </div>
        
        <p style="text-align: center; color: #8a6a74; font-size: 12px; margin-top: 20px;">
          © 2025 Freezy Bite • Freeze It … Bite It … Love It.
        </p>
      </div>
    </body>
    </html>
    `;

        const { data, error } = await resend.emails.send({
            from: 'Freezy Bite <orders@resend.dev>',
            to: [customerEmail],
            subject: `Order Confirmed #${orderId} - Freezy Bite 🍓`,
            html: emailHtml,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, messageId: data?.id });
    } catch (error) {
        console.error('Email API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
