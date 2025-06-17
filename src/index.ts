import { OneBlinkAPIHostingRequest } from '@oneblink/cli'
import Boom from '@hapi/boom'
import * as HttpWrapper from './BfsLibrary/httpWrapper.js'
import * as BfsOneBlinkSdkHelpers from './BfsLibrary/oneblinkSdkHelpers.mjs'
import * as ReturnPacket from './localLibrary/returnPacket.js';
import * as JsonTools from './localLibrary/jsonTools.js';
import * as CriticalErrorCentralHandler from './localLibrary/criticalErrorCentralHandler.mjs'
import * as ProjectTypes from './projectTypes.js'

export async function post(
  request: OneBlinkAPIHostingRequest<{
    element: Record<string, any>
    definition: Record<string, any>
    submission: Record<string, string>
  }>,
) {

  // console.log("request.body", request.body);

  const triggerElement = request.body.element
  const triggerElementName = triggerElement.name;
  const triggerElementLabel = triggerElement.label;

  console.log("triggerElementName", triggerElementName);

  if (!request || !request.body || !request.body.submission) {
    throw Boom.badRequest('submission missing')
  }
  const { submission } = request.body

  // Don't type check  MaxCaseItemId as we want to allow the triggerElementName to be changeable by the using developer 
  const MaxCaseItemId = parseInt(submission[triggerElementName]);
  console.log(`triggerElementName: ${triggerElementName} (MaxCaseItemId)`, MaxCaseItemId);

  const allElements = JsonTools.flattenElements(request.body.definition.elements)
  const maxCaseLookupResponseNotFoundAppendInfoDefaultValue = allElements.find(
    (el: { name: string; }) => el.name === "MaxCaseLookup_ResponseNotFound_AppendInfo"
  )?.defaultValue;

  if (!MaxCaseItemId) {
    throw Boom.badRequest(`triggerElementName ${triggerElementName} (MaxCaseItemId) isn't giving us a value: ${MaxCaseItemId}`)
  }

  var responseToOneBlink: ProjectTypes.ResponseToOneBlinkElements
  const flowRequestData: ProjectTypes.FlowRequestData = {
    FormName: request.body.definition.name,
    FormId: request.body.definition.id,
    MaxCaseItemId: MaxCaseItemId,
    MaxCaseLookup_MaxProjectName: submission.MaxCaseLookup_MaxProjectName,
    MaxCaseLookup_MaxEnvironment: submission.MaxCaseLookup_MaxEnvironment,
    MaxCaseLookup_MaxSiteId: submission.MaxCaseLookup_MaxSiteId
  };
  try {
    const url = process.env.POWER_AUTOMATE_HTTP_POST_URL!;
    const headers: Record<string, string>[] = [
      { "x-power-automate-secret-key-id": process.env.POWER_AUTOMATE_SECRET_KEY! },
      { "origin": String(request.headers.origin) }
    ];
    const response: HttpWrapper.DatabaseResponse = await HttpWrapper.postData(flowRequestData, url, headers)
    if (!response) {
      throw Boom.badRequest('Could not get a response in time. Please try again.')
    }

    console.log("response", response);

    const flowResponseData: ProjectTypes.FlowResponseData[] = JSON.parse(response.body)

    console.log("flowResponseData", flowResponseData);

    if (flowResponseData.length === 0) {
      throw Boom.notFound(); // Raises a 404
    }

    responseToOneBlink = ReturnPacket.getPacket(flowResponseData, response.statusCode, MaxCaseItemId, triggerElementLabel)
    console.log("responseToOneBlink", responseToOneBlink)
    return responseToOneBlink

    // Returning a well formed object, without error codes, is enough for the OneBlink UI's Data lookup element
    // to register this as valid.
    // return {} 

    // If we wanted to return values to other elements we'd do something like the following
    // return { 
    //   "TempPicDataTarget": JSON.stringify(submission),
    //   "OtherElement": "Some Value"
    // } 
  } catch (e: any) {

    const formsAppId: number = BfsOneBlinkSdkHelpers.getFormsAppIdSafely(request.body.definition.formsAppIds);
    let errorRecipientEmailAddresses: string[] = await BfsOneBlinkSdkHelpers.getAppNotificationsAndDefaultEmails(formsAppId)
    const criticalErrorCoolDownKey = flowRequestData.FormId + '-' + flowRequestData.MaxCaseLookup_MaxProjectName + '-' + flowRequestData.MaxCaseLookup_MaxEnvironment
    let criticalErrorType: ProjectTypes.CriticalErrorType;

    // Uncomment For testing the recipients rather than spamming those listed in the App's notification list
    const rawRecipients = process.env.RECIPIENT_EMAIL_ADDRESSES!
    errorRecipientEmailAddresses = rawRecipients
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)  // removes empty strings
    
    console.log('errorRecipientEmailAddresses', errorRecipientEmailAddresses);

    /*     
      Boom messages that OneBlink will display

      OB only recognizes Boom.badRequest() messages. At least it doesn't recognize:
        * Boom.notFound; nor
        * throw Boom.badImplementation
      
      As this gets inserted into a <p>, use:
      <br /><br /> if you want paragraphs; and
      <br /> if you want an end of line 
    */
    if (e instanceof Boom.Boom && e.output && e.output.statusCode === 404) {
      const notFoundMessageHtml = `The '${triggerElementLabel}', ${MaxCaseItemId}, could not be found in our database.` + ' ' + maxCaseLookupResponseNotFoundAppendInfoDefaultValue
      throw Boom.badRequest(notFoundMessageHtml)

    } else if (e instanceof Boom.Boom && e.output.statusCode === 502 && e.message.includes("The server did not receive a response from an upstream server")) {
      // Simulate by choosing Fire Ant Carriers dev

      criticalErrorType = 'Not found - critical error - service down - max';
      const responseToOneBlink = await CriticalErrorCentralHandler.handleError(
        criticalErrorType,
        flowRequestData,
        criticalErrorCoolDownKey,
        errorRecipientEmailAddresses,
        e,
        triggerElement
      )
      if (responseToOneBlink) return responseToOneBlink

    } else if (e instanceof Boom.Boom && e.output.statusCode === 401) {
      // The authentication credentials are not valid. Occurs at least when the Power Automate URL is wrong.
      // Simulate by appending "WRONG" to a url at .blinkmrc.json > POWER_AUTOMATE_HTTP_POST_URL > [Relevant environment]

      criticalErrorType = 'Not found - critical error - service down - power automate';
      const responseToOneBlink = await CriticalErrorCentralHandler.handleError(
        criticalErrorType,
        flowRequestData,
        criticalErrorCoolDownKey,
        errorRecipientEmailAddresses,
        e,
        triggerElement
      )
      if (responseToOneBlink) return responseToOneBlink

    } else {
      criticalErrorType = 'Not found - critical error - unanticipated error';
      const responseToOneBlink = await CriticalErrorCentralHandler.handleError(
        criticalErrorType,
        flowRequestData,
        criticalErrorCoolDownKey,
        errorRecipientEmailAddresses,
        e,
        triggerElement
      )
      if (responseToOneBlink) return responseToOneBlink

    }
  } // catch
}
