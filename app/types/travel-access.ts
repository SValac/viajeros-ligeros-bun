export type TravelAccessCode = {
  id: string;
  travelId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
};

export type TravelAccessCodeGenerated = TravelAccessCode & { code: string };

export type TravelAccessCodeErrorCode
  = | 'not-authorized' | 'travel-not-eligible' | 'travel-not-found'
    | 'no-active-code' | 'code-generation-conflict' | 'unknown-error';

export class TravelAccessCodeError extends Error {
  code: TravelAccessCodeErrorCode;
  constructor(code: TravelAccessCodeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}
