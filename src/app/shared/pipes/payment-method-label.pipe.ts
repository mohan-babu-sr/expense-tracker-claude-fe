import { Pipe, PipeTransform } from '@angular/core';
import { PAYMENT_METHOD_MAP } from '../constants';
import { PaymentMethod } from '../models';

/**
 * API value → display text:  {{ 'NetBanking' | paymentMethodLabel }} → "Net Banking".
 * Empty/unknown values render as '' (or the raw value), never "undefined".
 */
@Pipe({
  name: 'paymentMethodLabel',
  standalone: false,
})
export class PaymentMethodLabelPipe implements PipeTransform {
  transform(value: PaymentMethod | null | undefined): string {
    if (!value) return '';
    return PAYMENT_METHOD_MAP[value]?.label ?? value;
  }
}
