import {
  inquiryContactMethodLabels,
  inquiryContactMethods,
} from "@/features/inquiries/form-config";
import type { ManualInquiryActionState } from "@/features/inquiries/types";

export const initialState: ManualInquiryActionState = {};

export const contactMethodOptions = inquiryContactMethods.map((method) => ({
  label: inquiryContactMethodLabels[method],
  value: method,
}));
