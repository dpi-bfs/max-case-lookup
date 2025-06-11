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
  var maxCaseResponseTextHtml:string | null = null // We insert into a text element then an Info element references this
  
  let foundInDatabase = false
  if (statusCode == 200) {
    foundInDatabase = true

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

  } // if (statusCode == 200)

  console.log("Returning some data")

  // The value side must be a string, except for switches which can be a boolean
  return {
    "FoundInDatabase": `${foundInDatabase}`,
    "MaxCaseLookup_ResponseFoundText": maxCaseResponseTextHtml,
    "ApiCodeVersionText": process.env.API_CODE_VERSION
  }
}