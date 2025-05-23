import { OneBlinkAPIHostingRequest } from '@oneblink/cli'
import Boom from '@hapi/boom'
// import * as Globals from './globals.js'
import * as HttpWrapper from './BfsLibrary/httpWrapper.js'
import * as ProjectTypes from './projectTypes.js'
import * as CarriersInfoReturnPacket from './localLibrary/carriersInfoReturnPacket.js';
// import * as FormLookupReturnPacket from './formLookupReturnPacket.js'

export async function post(
  request: OneBlinkAPIHostingRequest<{
    definition: Record<string, any>
    element: Record<string, any>
    submission: Record<string, string>
  }>,
) {

  const triggerElementName = request.body.element.name;
  console.log("triggerElementName", triggerElementName);
  
  if (!request || !request.body || !request.body.submission) {
    throw Boom.badRequest('submission missing')
  }
  const { submission } = request.body

  const PaperCertificateNumber: ProjectTypes.RecordOfMovementAndInspection["PaperCertificateNumber"] = submission["PaperCertificateNumber"]
  console.log("PaperCertificateNumber", PaperCertificateNumber);

  if (!PaperCertificateNumber) {
    throw Boom.badRequest(`"PaperCertificateNumber isn't giving us a value: ${PaperCertificateNumber}`)
  }

  try {
    const data = { PaperCertificateNumber: PaperCertificateNumber };
    const url = process.env.POWER_AUTOMATE_CERTIFICATE_VALIDATOR_URL!;
    const headers: Record<string, string>[] = [
      { "x-parthenium-certificate-validator-secret-key-id": process.env.X_PARTHENIUM_CERTIFICATE_VALIDATOR_SECRET_KEY_ID! },
      { "origin": String(request.headers.origin) }
    ];
    const response: HttpWrapper.DatabaseResponse = await HttpWrapper.postData(data, url, headers)
    if (!response) {
      throw Boom.badRequest('Could not get a response in time. Please try again.')
    } 

    console.log("response", response);
    
    const flowCarriers: ProjectTypes.FlowCarrierData[] = JSON.parse(response.body)

    console.log("flowCarriers", flowCarriers);

    if (flowCarriers.length === 0) {
      throw Boom.notFound(); // Raises a 404
    }
    
    return CarriersInfoReturnPacket.getPacket(flowCarriers, response.statusCode, PaperCertificateNumber)  
    
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
    if (e instanceof Boom.Boom && e.output && e.output.statusCode === 404) {
      throw Boom.badRequest(`The 'Paper certificate number', ${PaperCertificateNumber}, could not be found in the database. Are you sure this is the number on your Carrier Biosecurity Certificate? You must include the alphabetical prefix, for example 'P1234'.`)

    } else if (e instanceof Boom.Boom && e.output.statusCode === 502 && e.message.includes("The server did not receive a response from an upstream server")) {
      throw Boom.badRequest(`The validation service was down. We did not receive a response from the server`)

    } else if (e instanceof Boom.Boom) {
      throw e

    } else {
      console.error(e);
      throw Boom.badImplementation('uncaught error');
    }
  }
}