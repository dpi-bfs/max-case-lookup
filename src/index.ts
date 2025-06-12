import { OneBlinkAPIHostingRequest } from '@oneblink/cli'
import Boom from '@hapi/boom'
import * as HttpWrapper from './BfsLibrary/httpWrapper.js'
import * as ProjectTypes from './projectTypes.js'
import * as ReturnPacket from './localLibrary/returnPacket.js';
import * as JsonTools from './localLibrary/jsonTools.js';

// import * as FormLookupReturnPacket from './formLookupReturnPacket.js'

export async function post(
  request: OneBlinkAPIHostingRequest<{
    element: Record<string, any>
    definition: Record<string, any>
    submission: Record<string, string>
  }>,
) {

  // console.log("request.body", request.body);

  const triggerElementName = request.body.element.name;
  const triggerElementLabel = request.body.element.label;

  console.log("triggerElementName", triggerElementName);
  
  if (!request || !request.body || !request.body.submission) {
    throw Boom.badRequest('submission missing')
  }
  const { submission } = request.body

  // Don't type check  MaxCaseItemId as we want to allow the triggerElementName to be changeable by the using developer 
  const MaxCaseItemId = parseInt(submission[triggerElementName]);
  console.log(`triggerElementName: ${triggerElementName} (MaxCaseItemId)`, MaxCaseItemId);

  const allElements = JsonTools.flattenElements(request.body.definition.elements)
  const maxCaseLookupResponseNotFoundAppendInfoDefaultValue  = allElements.find(
    (el: { name: string; }) => el.name === "MaxCaseLookup_ResponseNotFound_AppendInfo"
  )?.defaultValue;

  if (!MaxCaseItemId) {
    throw Boom.badRequest(`triggerElementName ${triggerElementName} (MaxCaseItemId) isn't giving us a value: ${MaxCaseItemId}`)
  }

  var responseToOneBlink:ProjectTypes.ResponseToOneBlinkElements
  try {
    const data: ProjectTypes.FlowRequestData = {
      FormName: request.body.definition.name,
      FormId: request.body.definition.id,
      MaxCaseItemId: MaxCaseItemId,
      MaxCaseLookup_MaxProjectName: submission.MaxCaseLookup_MaxProjectName,
      MaxCaseLookup_MaxEnvironment: submission.MaxCaseLookup_MaxEnvironment,
      MaxCaseLookup_MaxSiteId: submission.MaxCaseLookup_MaxSiteId
    };
    const url = process.env.POWER_AUTOMATE_HTTP_POST_URL!;
    const headers: Record<string, string>[] = [
      { "x-power-automate-secret-key-id": process.env.POWER_AUTOMATE_SECRET_KEY! },
      { "origin": String(request.headers.origin) }
    ];
    const response: HttpWrapper.DatabaseResponse = await HttpWrapper.postData(data, url, headers)
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

    /*     
      Boom messages that OneBlink will display

      OB only recognizes Boom.badRequest() messages.At least it doesn't recognize Boom.notFound
      
      As this gets inserted into a <p>, use:
      <br /><br /> if you want paragraphs; and
      <br /> if you want an end of line 
    */
    let notFoundServiceDownHtml; 
    if (e instanceof Boom.Boom && e.output && e.output.statusCode === 404) {
      const notFoundMessageHtml = `The '${triggerElementLabel}', ${MaxCaseItemId}, could not be found in our database.` + ' ' + maxCaseLookupResponseNotFoundAppendInfoDefaultValue
      throw Boom.badRequest(notFoundMessageHtml)

    } else if (e instanceof Boom.Boom && e.output.statusCode === 502 && e.message.includes("The server did not receive a response from an upstream server")) {
      // Simulate by choosing Fire Ant Carriers dev

      notFoundServiceDownHtml =
      `<P>The lookup service was down. Please continue to fill the form and submit without the lookup.</p>
      <p><br /></p>
      <P>(Technical details: Max is probably down; but also check if Power Automate is down.)</p>`

      console.log(notFoundServiceDownHtml)

      responseToOneBlink = {
        MaxCaseLookup_FoundInDatabase: 'Not found - service down',
        MaxCaseLookup_ResponseNotFoundText: notFoundServiceDownHtml,
      }
      
      return responseToOneBlink
    
    } else if (e instanceof Boom.Boom && e.output.statusCode === 401) {
      // The authentication credentials are not valid. Occurs at least when the Power Automate URL is wrong.

      notFoundServiceDownHtml =
      `<P>The lookup service was down. Please continue to fill the form and submit without the lookup.</p>
      <p><br /></p>
      <P>(Technical details: Power automate may be down or misconfigured. If Power automate is up check the Power automate url is set correctly at MaxCaseLookupAPI > .blinkmrc.json > POWER_AUTOMATE_HTTP_POST_URL.)</p>`

      console.log(notFoundServiceDownHtml)

      responseToOneBlink = {
        MaxCaseLookup_FoundInDatabase: 'Not found - service down',
        MaxCaseLookup_ResponseNotFoundText: notFoundServiceDownHtml,
      }
      
      return responseToOneBlink
      
    } else if (e instanceof Boom.Boom) {
      throw e

    } else {
      console.error(e);
      throw Boom.badImplementation('uncaught error');
    }
  }
}