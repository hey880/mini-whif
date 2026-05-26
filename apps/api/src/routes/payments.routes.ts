import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';

// Gem product catalog
export const GEM_PRODUCTS = [
  { id: 'gem_1520', gemAmount: 1520, baseAmount: 1520, bonusAmount: 0, price: 1900 },
  { id: 'gem_3920', gemAmount: 3920, baseAmount: 3920, bonusAmount: 0, price: 4900 },
  { id: 'gem_8316', gemAmount: 8316, baseAmount: 7920, bonusAmount: 396, price: 9900, badge: '가장 인기' },
  { id: 'gem_17034', gemAmount: 17034, baseAmount: 15920, bonusAmount: 1114, price: 19900 },
  { id: 'gem_25953', gemAmount: 25953, baseAmount: 23920, bonusAmount: 2033, price: 29900 },
  { id: 'gem_43912', gemAmount: 43912, baseAmount: 39920, bonusAmount: 3992, price: 49900 },
  { id: 'gem_91908', gemAmount: 91908, baseAmount: 79920, bonusAmount: 11988, price: 99900, badge: '가장 저렴' },
];

/**
 * PortOne API로 결제 검증
 * @returns 검증 결과 (성공 시 실제 결제 금액 포함)
 */
async function verifyPortOnePayment(
  paymentId: string,
  expectedAmount: number
): Promise<{
  success: boolean;
  actualAmount?: number;
  status?: string;
  error?: string;
}> {
  const PORTONE_API_KEY = process.env.PORTONE_API_KEY;
  const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;

  if (!PORTONE_API_KEY) {
    return { success: false, error: 'PortOne API key not configured' };
  }

  try {
    // PortOne API로 결제 정보 조회
    const response = await fetch(`https://api.portone.io/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `PortOne ${PORTONE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `PortOne API error: ${response.status} ${errorText}`,
      };
    }

    const paymentData = await response.json();

    // 결제 상태 검증
    if (paymentData.status !== 'paid' && paymentData.status !== 'PAID') {
      return {
        success: false,
        status: paymentData.status,
        error: `Payment not completed. Current status: ${paymentData.status}`,
      };
    }

    // 결제 금액 검증 (중요!)
    const actualAmount = paymentData.amount?.total || paymentData.totalAmount;
    if (actualAmount !== expectedAmount) {
      return {
        success: false,
        actualAmount,
        error: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`,
      };
    }

    return {
      success: true,
      actualAmount,
      status: paymentData.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function paymentsRoutes(server: FastifyInstance) {
  const PORTONE_CONFIGURED = !!process.env.PORTONE_API_KEY;

  if (!PORTONE_CONFIGURED) {
    server.log.warn('⚠️  PortOne API key not configured - payment endpoints will use mock mode');
  }

  // Get gem products catalog
  server.get('/payments/products', {
    schema: {
      tags: ['Payments'],
      description: 'Get available gem products',
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  gemAmount: { type: 'number' },
                  baseAmount: { type: 'number' },
                  bonusAmount: { type: 'number' },
                  price: { type: 'number' },
                  badge: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.send({ data: GEM_PRODUCTS });
  });

  // Prepare payment order
  server.post('/payments/prepare', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Payments'],
      description: 'Prepare a gem purchase order',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                orderId: { type: 'string' },
                amount: { type: 'number' },
                gemAmount: { type: 'number' },
                currency: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { productId } = request.body as { productId: string };

    // Find product in catalog
    const product = GEM_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    // Create order
    const order = await prisma.gemOrder.create({
      data: {
        userId: request.user!.id,
        productId,
        gemAmount: product.gemAmount,
        currency: 'KRW',
        priceAmount: product.price,
        paymentStatus: 'pending',
      },
    });

    return reply.send({
      data: {
        orderId: order.id,
        amount: order.priceAmount,
        gemAmount: order.gemAmount,
        currency: order.currency,
      },
    });
  });

  // Confirm payment
  server.post('/payments/confirm', {
    preHandler: [authenticateUser],
    schema: {
      tags: ['Payments'],
      description: 'Confirm a payment and add gems to wallet',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: { type: 'string' },
          paymentTransactionId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                orderId: { type: 'string' },
                gemsAdded: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { orderId, paymentTransactionId } = request.body as {
      orderId: string;
      paymentTransactionId?: string;
    };

    const order = await prisma.gemOrder.findUnique({
      where: { id: orderId },
    });

    if (!order || order.userId !== request.user!.id) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return reply.status(400).send({ error: 'Order already paid' });
    }

    // 결제 검증 (프로덕션 환경에서는 필수)
    if (PORTONE_CONFIGURED) {
      if (!paymentTransactionId) {
        return reply.status(400).send({
          error: 'Payment transaction ID is required',
        });
      }

      server.log.info({
        orderId,
        paymentTransactionId,
        expectedAmount: order.priceAmount,
      }, 'Verifying payment with PortOne API...');

      const verification = await verifyPortOnePayment(
        paymentTransactionId,
        order.priceAmount
      );

      if (!verification.success) {
        server.log.error({
          orderId,
          paymentTransactionId,
          error: verification.error,
          expectedAmount: order.priceAmount,
          actualAmount: verification.actualAmount,
          status: verification.status,
        }, '❌ Payment verification failed');

        return reply.status(400).send({
          error: 'Payment verification failed',
          details: verification.error,
        });
      }

      server.log.info({
        orderId,
        paymentTransactionId,
        amount: verification.actualAmount,
        status: verification.status,
      }, '✅ Payment verified successfully');
    } else {
      // Mock 모드는 개발 환경에서만 허용
      if (process.env.NODE_ENV === 'production') {
        return reply.status(501).send({
          error: 'Payment gateway not configured',
        });
      }
      server.log.warn(`⚠️  Mock payment verification for order ${orderId} (PortOne not configured)`);
    }

    // 트랜잭션으로 원자성 보장: 주문 업데이트 + Gem 지급 + 로그 기록
    await prisma.$transaction(async (tx) => {
      // 주문 상태 업데이트
      await tx.gemOrder.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'paid',
          paymentTransactionId: paymentTransactionId || 'MOCK_TXN_ID',
          paidAt: new Date(),
        },
      });

      // Gem 지급
      const updatedWallet = await tx.gemWallet.update({
        where: { userId: order.userId },
        data: {
          paidGemAmount: {
            increment: order.gemAmount,
          },
        },
      });

      // 총 잔액 계산
      const totalAfter =
        updatedWallet.paidGemAmount +
        updatedWallet.freeDailyGemAmount +
        updatedWallet.freePromoGemAmount;

      // 거래 로그 기록
      await tx.gemLog.create({
        data: {
          userId: order.userId,
          amount: order.gemAmount,
          gemType: 'paid',
          logType: 'purchase',
          balanceAfter: totalAfter,
          relatedOrderId: orderId,
          memo: `Purchased ${order.gemAmount} gems (${order.productId})`,
        },
      });
    });

    server.log.info(`✅ Payment confirmed for order ${orderId} - Added ${order.gemAmount} gems to user ${order.userId}`);

    return reply.send({
      data: {
        success: true,
        orderId: order.id,
        gemsAdded: order.gemAmount,
      },
    });
  });

  // PortOne webhook (for production)
  server.post('/payments/webhook', {
    schema: {
      tags: ['Payments'],
      description: 'PortOne payment webhook',
      hide: !PORTONE_CONFIGURED, // Hide from Swagger if not configured
    },
  }, async (request, reply) => {
    if (!PORTONE_CONFIGURED) {
      return reply.status(501).send({ error: 'Webhooks not configured' });
    }

    // TODO: Implement PortOne webhook verification
    server.log.info({ body: request.body }, 'PortOne webhook received');

    // Example webhook handling:
    // 1. Verify webhook signature
    // 2. Find order by payment transaction ID
    // 3. Check if order already processed
    // 4. Update order status and add gems
    // 5. Log transaction

    return reply.send({ received: true });
  });
}
