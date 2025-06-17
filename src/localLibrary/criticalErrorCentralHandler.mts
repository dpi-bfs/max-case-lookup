import Boom from '@hapi/boom'
import * as ProjectTypes from '../projectTypes.js'
import * as BfsCoolDownRegistry from '../BfsLibrary/coolDownRegistry.mjs'
import * as BfsDateTime from '../BfsLibrary/dateTime.mjs'
import * as OneBlinkToMailgun from "./oneBlinkToMailgun.mjs";

function isOnCriticalErrorUserCanSubmit(element: { customCssClasses?: string[] },): boolean {
  // false when the array is missing/empty
  return element.customCssClasses?.includes('max-case-lookup--critical-error--user-can-submit',) ?? false
}

function getNotFoundResponseHtml(errorMessageAdviceToUsers: string, errorMessageTechnicalDetailHtml: string): string {
  const notFoundResponseHtml = errorMessageAdviceToUsers + `<p><br /></p>` + errorMessageTechnicalDetailHtml;
  console.error("notFoundResponseHtml", notFoundResponseHtml)
  return notFoundResponseHtml
}

export async function handleError(
  criticalErrorType: ProjectTypes.CriticalErrorType,
  flowRequestData: ProjectTypes.FlowRequestData,
  criticalErrorCoolDownKey: string,
  errorRecipientEmailAddresses: string[],
  e: Error,
  triggerElement: Record<string, any>
): Promise<ProjectTypes.NotFoundResponse> {

  // E.g. 13 June 2025, 14:58 AEST. A format better suitable for looking up OneBlink logs.
  const nowLocalFormatted = BfsDateTime.getDateFormattedForOneBlinkLogReview(new Date());
  let notFoundResponseHtml;
  let errorMessageAdviceToUsers;
  const errorMessageTechnicalDetailHtml = `<P>(Technical details. At: ${nowLocalFormatted}; CriticalErrorType: ${criticalErrorType}; ErrorMessage: ${e.message})</p>`
  console.error(e);

  const isOnCriticalErrorUserCanSubmitFlag: boolean = isOnCriticalErrorUserCanSubmit(triggerElement)
  console.log('isOnCriticalErrorUserCanSubmitFlag', isOnCriticalErrorUserCanSubmitFlag);

  if (isOnCriticalErrorUserCanSubmitFlag) {
    errorMessageAdviceToUsers =
      "<P>A critical error occurred that's our fault. Our technicians have been contacted. Please continue to fill the form and submit without the lookup. We apologise for the inconvenience.</p>";
    notFoundResponseHtml = getNotFoundResponseHtml(errorMessageAdviceToUsers, errorMessageTechnicalDetailHtml);

  } else {
    errorMessageAdviceToUsers =
      "<P>A critical error occurred that's our fault. Our technicians have been contacted. You won't be able to submit. In a few hours try refreshing the form (F5 on your keyboard). We apologise for the inconvenience.</p>";
    notFoundResponseHtml = getNotFoundResponseHtml(errorMessageAdviceToUsers, errorMessageTechnicalDetailHtml);

  }

  const errorData: ProjectTypes.ErrorData = {
    ...flowRequestData,
    NotFoundResponseHtml: notFoundResponseHtml,
    CriticalErrorCoolDownKey: criticalErrorCoolDownKey,
    CriticalErrorCoolDownMinutes: parseInt(process.env.CRITICAL_ERROR_COOL_DOWN_MINUTES!),
    OneBlinkEnvironment: process.env.ONEBLINK_ENVIRONMENT!
  }

  // Prevent us being flooded with error emails
  await BfsCoolDownRegistry.runWithCoolDown(
    errorData.CriticalErrorCoolDownKey,
    OneBlinkToMailgun.sendMail,
    errorData.CriticalErrorCoolDownMinutes,
    errorData,
    errorRecipientEmailAddresses,
  )

  if (isOnCriticalErrorUserCanSubmitFlag) {
    const responseToOneBlink: ProjectTypes.NotFoundResponse = {
      MaxCaseLookup_FoundInDatabase: 'Not found - critical error - unanticipated error',
      MaxCaseLookup_ResponseNotFoundText: notFoundResponseHtml,
    }
    return responseToOneBlink

  } else {

    // We don't return any object to OB that spits data to elements, rather we BOOM and OB handles this as 
    // As message below the lookup element.
    throw Boom.badRequest(notFoundResponseHtml);
  }

}
