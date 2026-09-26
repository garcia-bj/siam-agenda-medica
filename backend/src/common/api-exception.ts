import { HttpException } from '@nestjs/common';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SLOT_TAKEN'
  | 'ALREADY_CANCELLED'
  | 'OUTSIDE_BUSINESS_HOURS'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details: ErrorDetail[];
}

/** Error con el formato del contrato (docs/api.md). Es lo que lanzan los services. */
export class ApiException extends HttpException {
  constructor(statusCode: number, code: ErrorCode, message: string, details: ErrorDetail[] = []) {
    super({ statusCode, code, message, details } satisfies ApiErrorBody, statusCode);
  }
}
