import nodemailer from "nodemailer";

// Create a transporter using Gmail
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Verify the transporter configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    // console.log("Email transporter is ready to send messages");
    return true;
  } catch (error) {
    console.error("Email transporter verification failed:", error);
    return false;
  }
}
