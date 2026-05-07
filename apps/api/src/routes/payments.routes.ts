import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../plugins/auth.js';
import { prisma } from '../config/prisma.js';

// Gem product catalog
export const GEM_PRODUCTS = [
  { id: 'gem_500', label: 'Starter', gemAmount: 500, price: 1100 },
  { id: 'gem_1200', label: 'Pro★', gemAmount: 1200, price: 2200, badge: 'Popular' },
  { id: 'gem_3000', label: 'Whale', gemAmount: 3000, price: 5500 },
];

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
                  label: { type: 'string' },
                  gemAmount: { type: 'number' },
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

    if (PORTONE_CONFIGURED) {
      // TODO: Verify payment with PortOne API
      server.log.info('Verifying payment with PortOne API...');
      // Example:
      // const verification = await verifyPortOnePayment(paymentTransactionId);
      // if (!verification.success) {
      //   return reply.status(400).send({ error: 'Payment verification failed' });
      // }
    } else {
      server.log.warn(`⚠️  Mock payment verification for order ${orderId} (PortOne not configured)`);
    }

    // Update order status
    await prisma.gemOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'paid',
        paymentTransactionId: paymentTransactionId || 'MOCK_TXN_ID',
        paidAt: new Date(),
      },
    });

    // Add gems to wallet
    await prisma.gemWallet.update({
      where: { userId: order.userId },
      data: {
        paidGemAmount: {
          increment: order.gemAmount,
        },
      },
    });

    // Log transaction
    await prisma.gemLog.create({
      data: {
        userId: order.userId,
        amount: order.gemAmount,
        gemType: 'paid',
        logType: 'purchase',
        relatedOrderId: orderId,
        memo: `Purchased ${order.gemAmount} gems (${order.productId})`,
      },
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
