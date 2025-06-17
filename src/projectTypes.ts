import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs"
// import * as OneBlink from "@oneblink/sdk"
// import * as OneBlinkTypes from "@oneblink/types"

/**
 * When defining project form submission interfaces
 * we don't list all the possible properties, only enough properties
 * to remove typescript errors when referenced elsewhere.
 * 
 * It's a feature that we don't list all the properties as this
 * allows many form elements to be changed without breaking typechecking.
 */


export interface FlowRequestData {
  FormName: string,
  FormId: number,
  MaxCaseItemId: number,
  MaxCaseLookup_MaxProjectName: string,
  MaxCaseLookup_MaxEnvironment: string,
  MaxCaseLookup_MaxSiteId: string
}

export interface ErrorData extends FlowRequestData {
  ErrorMessageHtml: string,
  CriticalErrorCoolDownKey: string,
  CriticalErrorCoolDownMinutes: number
  OneBlinkEnvironment: string,
}

export interface FlowResponseData {
  CaseItemId: number,
  SiteId: string
  IdentifierTypeValue: string,
  PicHolding: string,
  PropertyAddress: string
  PropertyCity: string
}

type FoundResponse = {
  MaxCaseLookup_FoundInDatabase: "Found";
  MaxCaseLookup_ResponseFoundText: string;
  MaxCaseLookup_ResponseNotFoundText?: never;
};

export type NotFoundResponse = {
  MaxCaseLookup_FoundInDatabase:
    | "Not found - search returned nothing"
    | "Not found - critical error - service down"
    | "Not found - critical error - unanticipated error";
  MaxCaseLookup_ResponseFoundText?: never;
  MaxCaseLookup_ResponseNotFoundText: string;
};

export type ResponseToOneBlinkElements = FoundResponse | NotFoundResponse;

/**
 * Interface syntax examples to hand
 */

// export interface FlowCarrierData extends Carrier {
//   trackingCode: string,
//   CarrierMaskedSerialNumber: string
// }


// export interface ApprovalFormSubmissionProjectSpecific extends OneBlinkHelpers.ApprovalFormSubmission {
//   ApprovalFormId: number,
//   Carriers: Carrier[],
//   CertificateInForceForDays: number,
//   InspectionDate: string,
//   PaperCertificateNumber: string,
//   InspectionResult: string,
//   InspectionFacility: string
// }


// export interface PaymentDataToDatabase {
//   PaymentAddedViaFormID: number,
//   PaymentAddedViaFormTrackingCode: string,
//   TaxInvoiceToFirstName: string,
//   TaxInvoiceToLastName: string,
//   TaxInvoiceToPhone: string,
//   TaxInvoiceToEmail: string | undefined,
//   TaxInvoiceToAbn: string | undefined,
//   TaxInvoiceToBusinessName: string | undefined,
//   BiosecurityCertificateFee: number,
//   SubmissionPaymentStatus: string,
//   SubmissionPaymentResponseCode: string,
//   SubmissionPaymentResponseDescription: string,
//   SubmissionPaymentReceiptNumber: string,
//   SubmissionPaymentTransactionDateTime: Date,
//   SubmissionPaymentPrincipalAmount: number,
//   SubmissionPaymentSurchargeAmount: number,
//   SubmissionPaymentTotalAmount: number
// }

// export interface ExtraData {
//   EnvPrefix: string,
//   PowerAutomateSecretKey: string,
//   BiosecurityCertificatePdf: string | undefined,
//   TaxInvoicePdf: string | undefined
// }

// export interface RecordOfMovementAndInspection extends
//   BaseFormSubmissionProjectSpecific,
//   ApprovalFormSubmissionProjectSpecific,
//   FormApprovalFlowInstanceSubset,
//   ExtraData,
//   PaymentDataToDatabase
//   {
//   }
