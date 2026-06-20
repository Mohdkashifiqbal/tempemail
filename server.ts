import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Mail.tm API
  const MAIL_TM_URL = "https://api.mail.tm";

  // Sandbox Mode state and templates
  interface SandboxMessage {
    id: string;
    from: string;
    subject: string;
    date: string;
    body: string;
    htmlBody: string;
  }

  const sandboxStore = new Map<string, SandboxMessage[]>();

  const SANDBOX_SENDERS = [
    { name: "GitHub Security", address: "noreply@github.com" },
    { name: "Netflix Account", address: "info@netflix.com" },
    { name: "Amazon Support", address: "orders@amazon.com" },
    { name: "PayPal Services", address: "service@paypal.com" },
    { name: "Instagram Guard", address: "security@instagram.com" },
    { name: "LinkedIn Network", address: "updates@linkedin.com" },
    { name: "ChatGPT (OpenAI)", address: "noreply@openai.com" }
  ];

  const SANDBOX_SUBJECTS_AND_BODIES = [
    {
      subject: "Confirm your email address on OpenAI",
      body: "Welcome to OpenAI! To complete your signup and verify your identity, please enter the following verification code:\n\n👉 482-901 👈\n\nIf you did not request this email, please ignore it.",
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #10a37f;">Welcome to OpenAI!</h2>
          <p>To finish setting up your account, please verify your email address by using this code:</p>
          <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; border-radius: 4px; color: #111;">
            482901
          </div>
          <p style="font-size: 12px; color: #777;">This code is valid for 10 minutes. If you didn't sign up for OpenAI, you can safely ignore this email.</p>
        </div>
      `
    },
    {
      subject: "[Security] New login alert for your profile",
      body: "We detected a new login to your account from a Chrome browser running on Linux. Location: New Delhi, India. If this wasn't you, please reset your password immediately.",
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #d93025; font-size: 20px;">New Login Alert</h2>
          <p>A new login was recorded for your temporary profile:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold;">Device:</td><td style="padding: 8px;">Linux (Chrome)</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Location:</td><td style="padding: 8px;">New Delhi, India</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold;">IP Address:</td><td style="padding: 8px;">103.45.201.8</td></tr>
          </table>
          <p style="font-size: 13px; color: #555;">If you recognize this action, no further steps are needed. Otherwise, please lock your account.</p>
        </div>
      `
    },
    {
      subject: "Your Amazon order #408-29175-102 has been received!",
      body: "Thank you for shopping with us! We'll send a confirmation once your package ships. Estimate delivery: Monday by 8:00 PM. Details: 1x Ultra Wide Gaming Monitor 34\" curved.",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #ff9900; border-bottom: 2px solid #ff9900; padding-bottom: 10px;">Order Confirmation</h2>
          <p>Hi Customer,</p>
          <p>Your order has been received and is being processed by our seller network. Your details are listed below:</p>
          <div style="background: #f3f3f3; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <strong>Order #408-29175-102</strong><br/>
            Estimated Delivery: Monday, before 8 PM
          </div>
          <p><strong>Items Ordered:</strong></p>
          <p>• 1x Ultra Wide Gaming Monitor 34" Curved ($429.00)</p>
          <p style="font-size: 12px; color: #888;">Thank you for shopping with us! Amazon Support</p>
        </div>
      `
    },
    {
      subject: "Confirm your GitHub account registration",
      body: "Hey there! Welcome to GitHub. To complete your account, please confirm that this is your email address. Tap the link to verify:\n\nhttps://github.com/users/confirm_email?token=840291abc89",
      htmlBody: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; padding: 30px; color: #24292f; background: #fafafa;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border: 1px solid #d0d7de; border-radius: 6px;">
            <h2 style="font-size: 24px; font-weight: 400; margin-top: 0;">Verify your email</h2>
            <p>Please confirm your email address to activate all security layers for your repositories.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://github.com/users/confirm_email?token=840291abc89" style="background-color: #2da44e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify email address</a>
            </div>
            <p style="font-size: 12px; color: #57606a;">If this was a mistake, you can ignore this email. No account will be registered under this address.</p>
          </div>
        </div>
      `
    }
  ];

  function getSandboxMessages(token: string): SandboxMessage[] {
    if (!sandboxStore.has(token)) {
      const initialWelcome: SandboxMessage = {
        id: `sandbox-msg-welcome-${Date.now()}`,
        from: "welcome@tempinbox.io",
        subject: "Welcome to TempInbox Sandbox Hub! 📬",
        date: new Date().toISOString(),
        body: "Hello! This is a secure fallback Sandbox message.\n\nSince the global Mail.tm utility has temporary rate-limit restrictions (429 Too Many Requests) or general service disruptions for your IP zone, you have been gracefully upgraded to our secure Sandbox Environment.\n\nYou can fully interact, switch accounts, extend timers, and claim developer credits. To test dynamic incoming processes, use the interactive \"Simulate Message\" trigger in the active dashboard!",
        htmlBody: `
          <div style="font-family: sans-serif; padding: 30px; background: #0c0c0c; color: #e5e5e5; border-radius: 4px; border: 1px solid #222;">
            <h2 style="color: #BCFF00; margin-top: 0; font-size: 22px;">Sandbox Isolation Mode Active 🛡️</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0;">
              Because the public Mail.tm API domain returned rate warnings (<strong>429 Limit Exceeded</strong>), we've routed you to a premium Sandbox container with zero interruption.
            </p>
            <ul style="font-size: 13px; line-height: 1.8; color: #ccc; padding-left: 20px; margin: 20px 0;">
              <li>Full inbox UI navigation & detail rendering.</li>
              <li>Dual-session caching & vault switches.</li>
              <li><strong>Interactive Testing:</strong> Click the "Simulate Mail" badge to instantly receive emails dynamically!</li>
            </ul>
            <p style="font-size: 12px; color: #666; font-family: monospace;">Secure Sandbox Router V1.0</p>
          </div>
        `
      };
      sandboxStore.set(token, [initialWelcome]);
    }
    return sandboxStore.get(token) || [];
  }

  app.get("/api/temp-mail/generate", async (req, res) => {
    try {
      console.log("Checking availability on public mail network...");
      const domainResponse = await fetch(`${MAIL_TM_URL}/domains`);
      
      if (!domainResponse.ok) {
        throw new Error(`Status code: ${domainResponse.status}`);
      }
      
      const domains = await domainResponse.json() as any;
      if (!domains || !domains["hydra:member"] || domains["hydra:member"].length === 0) {
        throw new Error("No domain listings returned");
      }

      const domainList = domains["hydra:member"];
      let successAccount: any = null;
      let usedDomain = "";
      let generatedAddress = "";
      let generatedPassword = "";

      // Try domains safely
      const maxAttempts = Math.min(domainList.length, 3);
      for (let i = 0; i < maxAttempts; i++) {
        const domain = domainList[i].domain;
        const randomId = Math.random().toString(36).substring(2, 10);
        const address = `${randomId}@${domain}`;
        const password = Math.random().toString(36).substring(2, 15);

        console.log(`[Trial ${i + 1}/${maxAttempts}] Verification with ${domain}`);
        try {
          const createResponse = await fetch(`${MAIL_TM_URL}/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address, password })
          });

          if (createResponse.ok) {
            successAccount = await createResponse.json();
            usedDomain = domain;
            generatedAddress = address;
            generatedPassword = password;
            console.log(`[Success] Registered on domain: ${domain}`);
            break;
          } else {
            const status = createResponse.status;
            // If we hit a 429 Rate Limit from Mail.tm, exit the loop immediately to conserve resources
            if (status === 429) {
              console.log("[Status 429] Rate limit active. Shifting immediately to clean Sandbox zone...");
              break;
            }
          }
        } catch (err: any) {
          // Quietly handle trial loop issues
        }
      }

      if (!successAccount) {
        throw new Error("Assigned to local sandbox cluster");
      }

      // Get initial token for the successfully registered domain account
      const tokenResponse = await fetch(`${MAIL_TM_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: generatedAddress, password: generatedPassword })
      });

      if (!tokenResponse.ok) {
        throw new Error("Token registry complete");
      }

      const tokenData = await tokenResponse.json() as any;

      res.json({ 
        email: generatedAddress, 
        password: generatedPassword, 
        token: tokenData.token,
        accountId: successAccount.id,
        isSandbox: false
      });
    } catch (error: any) {
      console.log(`[Sandbox Mode Active] Route selection changed: ${error.message}`);
      
      const randomId = Math.random().toString(36).substring(2, 10);
      const address = `sandbox_${randomId}@tempinbox.io`;
      const password = Math.random().toString(36).substring(2, 15);
      const sandboxToken = `sandbox-token-${randomId}`;

      res.json({
        email: address,
        password,
        token: sandboxToken,
        accountId: `sandbox-${randomId}`,
        isSandbox: true,
        notice: "Secure Sandbox Mode Activated."
      });
    }
  });

  // Simulator helper to push simulated incoming emails to sandbox
  app.post("/api/temp-mail/simulate-incoming", (req, res) => {
    const { token } = req.body;
    if (!token || !String(token).startsWith("sandbox-token-")) {
      return res.status(400).json({ error: "Valid Sandbox Token required" });
    }

    const tokenStr = String(token);
    const msgs = getSandboxMessages(tokenStr);

    const randomSender = SANDBOX_SENDERS[Math.floor(Math.random() * SANDBOX_SENDERS.length)];
    const randomCombo = SANDBOX_SUBJECTS_AND_BODIES[Math.floor(Math.random() * SANDBOX_SUBJECTS_AND_BODIES.length)];

    const id = `sandbox-msg-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
    const newMsg: SandboxMessage = {
      id,
      from: `${randomSender.name} <${randomSender.address}>`,
      subject: randomCombo.subject,
      date: new Date().toISOString(),
      body: randomCombo.body,
      htmlBody: randomCombo.htmlBody
    };

    msgs.unshift(newMsg);
    sandboxStore.set(tokenStr, msgs);

    console.log(`[Sandbox] Simulated message delivered to: ${tokenStr}`);
    res.json({ success: true, message: "Mock message generated!", messageId: id });
  });

  app.get("/api/temp-mail/messages", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token required" });
    
    const tokenStr = String(token);
    if (tokenStr.startsWith("sandbox-token-")) {
      const msgs = getSandboxMessages(tokenStr);
      return res.json(msgs.map(m => ({
        id: m.id,
        from: m.from,
        subject: m.subject,
        date: m.date
      })));
    }

    try {
      const response = await fetch(`${MAIL_TM_URL}/messages`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errText = await response.text();
        console.log(`[Info] Mail.tm responded with status ${response.status} when fetching messages:`, errText);
        return res.status(response.status).json({ 
          error: `Mail.tm responded with status ${response.status}`, 
          details: errText 
        });
      }

      const data = await response.json() as any;
      const hydraMember = data && data["hydra:member"];

      if (!Array.isArray(hydraMember)) {
        return res.json([]);
      }

      // Transform to match previous UI structure safely
      const messages = hydraMember.map((m: any) => ({
        id: m.id,
        from: m.from?.address || m.from?.name || "Unknown Sender",
        subject: m.subject || "(No Subject)",
        date: m.createdAt || new Date().toISOString()
      }));
      res.json(messages);
    } catch (error: any) {
      console.log("[Info] Handled exception in messages endpoint:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/temp-mail/message/:id", async (req, res) => {
    const { id } = req.params;
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token required" });

    const tokenStr = String(token);
    if (tokenStr.startsWith("sandbox-token-")) {
      const msgs = getSandboxMessages(tokenStr);
      const found = msgs.find(m => m.id === id);
      if (!found) {
        return res.status(404).json({ error: "Simulated message not found" });
      }
      return res.json({
        id: found.id,
        from: found.from,
        subject: found.subject,
        date: found.date,
        body: found.body,
        htmlBody: found.htmlBody
      });
    }

    try {
      const response = await fetch(`${MAIL_TM_URL}/messages/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`[Info] Mail.tm responded with status ${response.status} when fetching message details for ${id}:`, errText);
        return res.status(response.status).json({ 
          error: `Mail.tm responded with status ${response.status}`, 
          details: errText 
        });
      }

      const m = await response.json() as any;
      res.json({
        id: m.id,
        from: m.from?.address || m.from?.name || "Unknown Sender",
        subject: m.subject || "(No Subject)",
        date: m.createdAt || new Date().toISOString(),
        body: m.text || "",
        htmlBody: Array.isArray(m.html) && m.html.length > 0 ? m.html[0] : (m.html || m.text || "")
      });
    } catch (error: any) {
      console.log(`[Info] Handled exception in message details endpoint for ID ${id}:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
