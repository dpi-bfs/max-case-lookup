import * as MailGun from "../BfsLibrary/mailgunWrapper.mjs";

import * as Logs from "../BfsLibrary/logs.mjs"

import * as ProjectTypes from '../projectTypes.js'
import { generateEmailBusinessHtml } from "../templates/index.mjs";

export async function sendMail(errorData: ProjectTypes.ErrorData, businessEmails:string | string[]): Promise<void>{

  const SENDER_EMAIL_ADDRESS = process.env.SENDER_EMAIL_ADDRESS;

  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("SENDER_EMAIL_ADDRESS", SENDER_EMAIL_ADDRESS);
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Generating business HTML template for email");
  const emailBusinessHtml = await generateEmailBusinessHtml(errorData);
  if (Logs.LogLevel <= Logs.LogLevelEnum.privacyExposing) console.log("emailBusinessHtml", emailBusinessHtml);

  if (Logs.LogLevel <= Logs.LogLevelEnum.error)  console.log("Sending email");

  const oneblinkEnvironment = process.env.ONEBLINK_ENVIRONMENT!
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("oneblinkEnvironment", oneblinkEnvironment);
  
  const mailgunOptions = {
    testmode: false,
    internalEmail: true
  }
  const source = 'OneBlinkApi'
  const emailBusinessProps: MailGun.Props = {
    to: businessEmails,
    from: SENDER_EMAIL_ADDRESS, 
    subject: `${process.env.ENV_PREFIX}Critical error in MaxCaseLookupApi - Form: ${errorData.FormName}`,
    html: emailBusinessHtml,
  }

  await MailGun.sendEmail(emailBusinessProps, oneblinkEnvironment, source, mailgunOptions);
  
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Sent business email via MailGun")

}