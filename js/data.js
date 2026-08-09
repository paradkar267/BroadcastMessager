// Broadcast Miraya Real Production Data Storage

// Clean initial customer database (No dummy data)
const INITIAL_CUSTOMERS = [];

// Real WhatsApp approved templates
const TEMPLATES = [
  {
    id: 'tpl_miraya_launch',
    name: 'miraya_new_collection_invitation',
    category: 'MARKETING',
    language: 'en',
    status: 'APPROVED',
    title: '✨ Exclusive Collection Invitation',
    body: `✨ *You’re Invited, {{1}}!*

Miraya is bringing you an exclusive new collection.

👗 *New Arrivals* | ✨ *Exclusive Designs* | 🛍️ *Special Offers*

We’d love to have you with us!

📅 *Date:* {{2}}
📍 *Location:* {{3}}

*Team Miraya*`,
    variables: ['Customer Name', 'Event Date', 'Location'],
    defaultVarValues: {
      '1': 'Valued Guest',
      '2': '15th August 2026',
      '3': 'Miraya Store'
    }
  }
];

// Clean initial campaign history (No dummy campaigns)
const INITIAL_CAMPAIGNS = [];
