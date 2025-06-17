import Boom from '@hapi/boom'
import * as ProjectTypes from '../projectTypes.js'
import * as BfsCoolDownRegistry from '../BfsLibrary/coolDownRegistry.mjs'
import * as OneBlinkToMailgun from "./oneBlinkToMailgun.mjs";

function isOnCriticalErrorUserCanSubmit(element: { customCssClasses?: string[] },): boolean {
  // false when the array is missing/empty
  return element.customCssClasses?.includes('max-case-lookup--critical-error--user-can-submit',) ?? false
}

export async function handleError(
  unanticipatedErrorHtml: string,
  flowRequestData: ProjectTypes.FlowRequestData,
  criticalErrorCoolDownKey: string,
  errorRecipientEmailAddresses: string[],
  e: Error,
  triggerElement: Record<string, any>
): Promise<ProjectTypes.NotFoundResponse> {

    const errorData: ProjectTypes.ErrorData = {
      ...flowRequestData,
      ErrorMessageHtml: unanticipatedErrorHtml,
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

  console.error(e);
  console.error("unanticipatedErrorHtml", unanticipatedErrorHtml)

  const isOnCriticalErrorUserCanSubmitFlag: boolean = isOnCriticalErrorUserCanSubmit(triggerElement)
  console.log('isOnCriticalErrorUserCanSubmitFlag', isOnCriticalErrorUserCanSubmitFlag);
  let notFoundResponseHtml;

  if (isOnCriticalErrorUserCanSubmitFlag) {
    notFoundResponseHtml =
      `<P>Please continue to fill the form and submit without the lookup.</p>
          <p><br /></p>`
      + unanticipatedErrorHtml

    console.error("notFoundResponseHtml", notFoundResponseHtml)

    const responseToOneBlink: ProjectTypes.NotFoundResponse = {
      MaxCaseLookup_FoundInDatabase: 'Not found - critical error - unanticipated error',
      MaxCaseLookup_ResponseNotFoundText: notFoundResponseHtml,
    }
    return responseToOneBlink
  } else {
    throw Boom.badRequest(unanticipatedErrorHtml);
  }

}
