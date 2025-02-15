require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// ✅ Allow CORS for port 5173
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5001"], // Add other origins if needed
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// 📧 Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
});

// 📝 API to save referral data and send email
app.post("/api/referrals", async (req, res) => {
  try {
    const { referrerName, referrerEmail, friendName, friendEmail } = req.body;

    if (!referrerName || !referrerEmail || !friendName || !friendEmail) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if friendEmail already exists
    const existingReferral = await prisma.referral.findUnique({
      where: { friendEmail },
    });

    if (existingReferral) {
      return res.status(400).json({ error: "Friend email is already referred" });
    }

    // Save referral in the database
    const referral = await prisma.referral.create({
      data: { referrerName, referrerEmail, friendName, friendEmail },
    });

    // 📧 Send Referral Email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: friendEmail,
      subject: "You’ve been referred!",
      text: `Hello ${friendName},\n\n${referrerName} has referred you! Contact them at ${referrerEmail}.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Error sending email:", error);
        return res.status(500).json({ error: "Failed to send referral email" });
      }

      console.log("✅ Email sent:", info.response);
      res.status(201).json({ message: "Referral saved & email sent!", referral });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📝 API to get all referrals
app.get("/api/referrals", async (req, res) => {
  try {
    const referrals = await prisma.referral.findMany();
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Server listening
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
