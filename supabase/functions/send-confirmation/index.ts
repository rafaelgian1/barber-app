import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { client_name, client_email, client_phone, service_name, date, start_time, end_time } = await req.json();

    // Email στον πελάτη
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lakata Cuts <noreply@lakatacuts.com>",
        to: [client_email],
        subject: "✂️ Επιβεβαίωση Ραντεβού - Lakata Cuts",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #18181b; color: white; border-radius: 12px; overflow: hidden;">
            <div style="background: #d97706; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; color: black;">✂️ Lakata Cuts</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #fbbf24; margin-top: 0;">Το ραντεβού σου επιβεβαιώθηκε!</h2>
              <p style="color: #a1a1aa;">Γεια σου <strong style="color: white;">${client_name}</strong>,</p>
              <p style="color: #a1a1aa;">Το ραντεβού σου κλείστηκε επιτυχώς.</p>
              <div style="background: #27272a; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="color: #a1a1aa;">Υπηρεσία: </span>
                  <span style="color: white; font-weight: bold;">${service_name}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="color: #a1a1aa;">Ημερομηνία: </span>
                  <span style="color: white; font-weight: bold;">${date}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #a1a1aa;">Ώρα: </span>
                  <span style="color: #fbbf24; font-weight: bold;">${start_time} - ${end_time}</span>
                </div>
              </div>
              <p style="color: #a1a1aa; font-size: 14px;">Σε περίπτωση που θέλεις να ακυρώσεις, επικοινώνησε μαζί μας στο lakata.cuts στο Instagram. Ή στο +357 96 306807 (Κύπρος) / +30 695 1009786 (Ελλάδα).</p>
            </div>
          </div>
        `,
      }),
    });

    // Email στον Μιχαήλ
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lakata Cuts <noreply@lakatacuts.com>",
        to: ["lakatacuts@gmail.com"],
        subject: "📅 Νέο Ραντεβού - Lakata Cuts",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #d97706;">📅 Νέο Ραντεβού</h2>
            <p><strong>Πελάτης:</strong> ${client_name}</p>
            <p><strong>Email:</strong> ${client_email}</p>
            <p><strong>Τηλέφωνο:</strong> ${client_phone ?? 'Δεν δόθηκε'}</p>
            <p><strong>Υπηρεσία:</strong> ${service_name}</p>
            <p><strong>Ημερομηνία:</strong> ${date}</p>
            <p><strong>Ώρα:</strong> ${start_time} - ${end_time}</p>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});