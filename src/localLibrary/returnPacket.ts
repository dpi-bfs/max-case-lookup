import * as ProjectTypes from '../projectTypes.js'
import { DatabaseResponse } from '../BfsLibrary/httpWrapper.js'

/* 
Returning a well formed object, without error codes, is enough for the OneBlink UI's Data lookup element
to register this as valid.
return {} 

If we wanted to return values to other elements we'd do something like the following
return { 
  "TempPicDataTarget": JSON.stringify(submission),
  "OtherElement": "Some Value"
}  
**/
export function getPacket(
  flowResponseData: ProjectTypes.FlowResponseData | ProjectTypes.FlowResponseData[],
  statusCode: DatabaseResponse["statusCode"],
  maxCaseItemId: number,
  triggerElementLabel: string) {

  //## Initialize

  // const newParagraph = '<p><br /></p>'
  
  console.log('In getPacket > flowResponseData', flowResponseData);

  const rows = Array.isArray(flowResponseData)
    ? flowResponseData
    : [flowResponseData];
  
  console.log('In getPacket > rows', rows);

  // Null can be assigned to a OneBlink text element.
  var tableHtml = null
  var maxCaseResponseTextHtml:string = "" // We insert into a text element then an Info element references this
  
  var foundInDatabase
  var responseToOneBlinkElements: ProjectTypes.ResponseToOneBlinkElements;

  if (statusCode == 200) {
    
    const tableRows = rows
      .map(r => `
        <tr>
          <td>${r.IdentifierTypeValue}</td>
          <td>${r.PicHolding}</td>
          <td>${r.PropertyAddress}</td>
          <td>${r.PropertyCity}</td>
        </tr>`)
      .join('');

    tableHtml =
      `<table>
      <thead>
        <tr>
          <td>Identifier type value</td>
          <td>Pic holding</td>
          <td>Property address</td>
          <td>Property city</td>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>`

    maxCaseResponseTextHtml =
      `<p>For '${triggerElementLabel}' ${maxCaseItemId} we found a match with the following details.</p>
      <p><br /></p>`
      + tableHtml
    
    responseToOneBlinkElements = {
      MaxCaseLookup_ResponseFoundText: maxCaseResponseTextHtml,
    }

  } else {

    responseToOneBlinkElements = {
      MaxCaseLookup_ResponseNotFoundText: 'No match in our database.',
    }
    
  } 

  console.log("Returning some data")

  // The value side must be a string, except for switches which can be a boolean
  // Use a string (and a radio button element) if you need three values: true, false, and null (not set)

  return responseToOneBlinkElements
}