/**
 * Order-related Zod validation schemas.
 */

import { z } from 'zod';

import { cuidSchema } from './auth.js';

// ═══ Place Order ═══

const orderItemAddOnSchema = z.object({
  addOnGroupId: cuidSchema,
  optionIds: z.array(cuidSchema).min(1, 'At least one option must be selected'),
});

const orderItemSchema = z.object({
  menuItemId: cuidSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 per item'),
  addOns: z.array(orderItemAddOnSchema).optional(),
  specialInstructions: z.string().max(500).optional(),
});

export const placeOrderSchema = z
  .object({
    restaurantId: cuidSchema,
    items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
    deliveryAddressId: cuidSchema,
    orderType: z.enum(['INSTANT', 'SCHEDULED']),
    scheduledFor: z.string().datetime().optional(),
    promoCode: z.string().max(30).optional(),
    tipAmount: z.number().int().min(0).default(0),
    paymentMethod: z.literal('RAZORPAY'),
    specialInstructions: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.orderType === 'SCHEDULED' && !data.scheduledFor) return false;
      return true;
    },
    { message: 'scheduledFor is required for scheduled orders' },
  );

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

// ═══ Verify Payment ═══

export const verifyPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

// ═══ Cancel Order ═══

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

// ═══ Rate Order ═══

export const rateOrderSchema = z.object({
  foodRating: z.number().int().min(1).max(5),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  reviewText: z.string().max(1000).optional(),
});

export type RateOrderInput = z.infer<typeof rateOrderSchema>;
