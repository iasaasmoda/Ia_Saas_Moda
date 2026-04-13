const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export async function sendWhatsAppMessage(instance: string, number: string, text: string) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('Evolution API credentials missing');
    return;
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: number,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: false
        },
        textMessage: {
          text: text
        }
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}
