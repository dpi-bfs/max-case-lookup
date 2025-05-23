import * as ProjectTypes from '../projectTypes.js'
import { DatabaseResponse } from '../BfsLibrary/httpWrapper.js'
// import * as LibDateTime from '../BfsLibrary/dateTime.mjs'

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
  flowCarriers: ProjectTypes.FlowCarrierData[],
  statusCode: DatabaseResponse["statusCode"],
  paperCertificateNumber: string) {

  //## Initialize 

  // const newParagraph = '<p><br /></p>'

  // Null can be assigned to a OneBlink text element.
  var tableHtml = null
  var carriersTextHtml = null // We insert into a text element then an Info element references this
  

  let foundInDatabase = false
  if (statusCode == 200) {
    foundInDatabase = true

    let tableRows = ''

    flowCarriers.forEach((element: ProjectTypes.FlowCarrierData, index) => {
      tableRows +=
        `<tr>
        <td>${element.CarrierType}</td>
        <td>${element.CarrierMake}</td>
        <td>${element.CarrierModel}</td>
        <td>${element.CarrierMaskedSerialNumber}</td>
      </tr>`
    })

    tableHtml = 
      `<table>
      <thead>
        <tr>
          <td>Type</td>
          <td>Make</td>
          <td>Model</td>
          <td>Masked serial number (last three characters)</td>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>`

    carriersTextHtml =
      `<p>Please ensure that for your Carrier Biosecurity Certificate with 'Paper certificate number' ${paperCertificateNumber} the following carrier details match.</p>
      <p><br /></p>
      <p>In rare cases Carrier Biosecurity Certificate carrier details will be different to that supplied on a corresponding Record of Movement (ROM). Namely, where carrier details where in error on the ROM and this was corrected by an inspector before issuing the Carrier Biosecurity Certificate.</p>
      <p><br /></p>` 
      + tableHtml

  } // if (statusCode == 200)

  console.log("Returning some data")

  // The value side must be a string, except for switches which can be a boolean
  return {
    "FoundInDatabase": `${foundInDatabase}`,
    "CarriersText": carriersTextHtml,
    "ApiCodeVersionText": process.env.API_CODE_VERSION
  }
}