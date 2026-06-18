import "server-only";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

const configured = !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);

export async function sendSms(to: string, body: string): Promise<void> {
  if (!configured) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[sms stub] to=${to}\n${body}`);
    }
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM!, Body: body }).toString(),
  });
  if (!res.ok) {
    console.error(`[sms] ${res.status}`, await res.text());
  }
}
