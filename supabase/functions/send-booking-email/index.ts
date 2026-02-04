import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = "re_i7q9td2B_wvHenMdn7dZ4KLCfuC573mRN";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookingEmail {
  guestName: string;
  guestEmail: string;
  bookingId: string;
  roomName: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  nights: number;
  totalPrice: number;
  specialRequests?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const bookingData: BookingEmail = await req.json();

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #8B7355 0%, #A0826D 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
          }
          .booking-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 1.2em;
            color: #8B7355;
          }
          .footer {
            background: #333;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 10px 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏨 מלון DELUX</h1>
          <p>אישור הזמנה</p>
        </div>

        <div class="content">
          <p>שלום ${bookingData.guestName},</p>
          <p>תודה שבחרת במלון DELUX! ההזמנה שלך אושרה בהצלחה.</p>

          <div class="booking-details">
            <h2 style="color: #8B7355; margin-top: 0;">פרטי ההזמנה</h2>

            <div class="detail-row">
              <span>מספר הזמנה:</span>
              <strong>${bookingData.bookingId}</strong>
            </div>

            <div class="detail-row">
              <span>סוג חדר:</span>
              <strong>${bookingData.roomName}</strong>
            </div>

            <div class="detail-row">
              <span>תאריך כניסה:</span>
              <strong>${new Date(bookingData.checkInDate).toLocaleDateString('he-IL')}</strong>
            </div>

            <div class="detail-row">
              <span>תאריך יציאה:</span>
              <strong>${new Date(bookingData.checkOutDate).toLocaleDateString('he-IL')}</strong>
            </div>

            <div class="detail-row">
              <span>מספר לילות:</span>
              <strong>${bookingData.nights}</strong>
            </div>

            <div class="detail-row">
              <span>מספר אורחים:</span>
              <strong>${bookingData.numGuests}</strong>
            </div>

            ${bookingData.specialRequests ? `
            <div class="detail-row">
              <span>בקשות מיוחדות:</span>
              <strong>${bookingData.specialRequests}</strong>
            </div>
            ` : ''}

            <div class="detail-row">
              <span>סה"כ לתשלום:</span>
              <strong>₪${bookingData.totalPrice.toLocaleString()}</strong>
            </div>
          </div>

          <p><strong>הערות חשובות:</strong></p>
          <ul>
            <li>שעת צ'ק-אין: 15:00</li>
            <li>שעת צ'ק-אאוט: 11:00</li>
            <li>נא להציג תעודת זהות בעת הצ'ק-אין</li>
          </ul>

          <p>לשאלות נוספות, אנא צרו קשר במספר: 03-1234567</p>
        </div>

        <div class="footer">
          <p>מלון DELUX | רחוב הדוגמה 123, תל אביב</p>
          <p>טלפון: 03-1234567 | דוא"ל: info@deluxhotel.com</p>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "מלון DELUX <onboarding@resend.dev>",
        to: [bookingData.guestEmail],
        subject: `אישור הזמנה #${bookingData.bookingId} - מלון DELUX`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailId: resendData.id
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
