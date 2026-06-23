import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import logger from "../utils/logger.js";

let sesClient = null;

const initSES = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("AWS SES credentials are not configured");
  }

  sesClient = new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  logger.info("AWS SES client initialized", { region });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.AWS_SES_FROM_EMAIL;

  if (!from) {
    throw new Error("AWS_SES_FROM_EMAIL is not configured");
  }

  const command = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
        Text: { Data: text, Charset: "UTF-8" },
      },
    },
  });

  await sesClient.send(command);
  logger.info("Email sent via SES", { to, subject });
};

export { initSES, sendEmail };
