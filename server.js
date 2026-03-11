const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// --- CONFIGURATION ---
const BREVO_API_KEY = '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';
const WEBHOOK_SECRET = 'my_super_secret_token'; // Ensure this matches WP Webhooks Header
const LIST_ID = 3; // Check your Brevo Dashboard for the correct List ID number
const PORT = process.env.PORT || 3000;
app.post('/wp-publish-webhook', async (req, res) => {
    // 1. Security Check
    const incomingSecret = req.headers['x-webhook-secret'];
    if (incomingSecret !== WEBHOOK_SECRET) {
        console.log("Unauthorized request blocked.");
        return res.status(401).send('Unauthorized');
    }

    // 2. Get Post Data from WordPress
    // Note: WP Webhooks usually sends data inside a 'post' object or direct root
    const postTitle = req.body.post_title || "New Blog Post";
    const postUrl = req.body.post_permalink || "#";

    console.log(`Processing new post: ${postTitle}`);

    try {
        // 3. Fetch Subscribers from Brevo List
        const listResponse = await axios.get(`https://api.api.brevo.com/v3/contacts/lists/${LIST_ID}/contacts`, {
            headers: { 'api-key': BREVO_API_KEY }
        });

        const recipients = listResponse.data.contacts.map(contact => ({ email: contact.email }));

        if (recipients.length === 0) {
            console.log("No contacts found in this list.");
            return res.status(200).send("No subscribers to notify.");
        }

        // 4. Send the Email
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: "The Whispering Sage",email: "blog@thewhisperingsage.com"},
            to: recipients,
            subject: `New Post: ${postTitle}`,
            htmlContent: `
                <html>
                    <body>
                        <h1>We just published: ${postTitle}</h1>
                        <p>Click below to read the full article on our blog.</p>
                        <a href="${postUrl}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Read More</a>
                    </body>
                </html>`
        }, {
            headers: { 
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Successfully sent to ${recipients.length} subscribers.`);
        res.status(200).send('Emails dispatched.');

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to process email sending.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Your endpoint is: http://your-domain.com:${PORT}/wp-publish-webhook`);
});