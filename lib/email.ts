import "server-only";
import nodemailer from "nodemailer";

export function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD?.replace(/\s/g, ""),
    },
  });
}
