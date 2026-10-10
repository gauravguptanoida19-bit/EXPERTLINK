export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ExpertLink API',
    version: '1.0.0',
    description: 'Production-style expert-network matching platform with ML ranking, BullMQ background queues, and real-time updates.'
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token in Authorization: Bearer <token>'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid credentials or resource not found' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          details: { type: 'object' }
        },
        required: ['success', 'message']
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          role: { type: 'string', enum: ['CLIENT', 'EXPERT', 'ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password', 'role'],
        properties: {
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'Password123!' },
          role: { type: 'string', enum: ['CLIENT', 'EXPERT', 'ADMIN'] }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'client@expertlink.com' },
          password: { type: 'string', format: 'password', example: 'Password123!' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'string', example: '15m' }
                }
              }
            }
          }
        }
      },
      Query: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          clientId: { type: 'string' },
          title: { type: 'string', example: 'AI Agents in FinTech' },
          description: { type: 'string', example: 'Technical architecture consultation on autonomous settlement agents' },
          industry: { type: 'string', example: 'Fintech' },
          budgetUsd: { type: 'number', example: 500 },
          status: { type: 'string', enum: ['OPEN', 'MATCHED', 'CLOSED'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateQueryRequest: {
        type: 'object',
        required: ['title', 'description', 'industry', 'budgetUsd'],
        properties: {
          title: { type: 'string', example: 'AI Agents in FinTech' },
          description: { type: 'string', example: 'Evaluating architecture trade-offs for transaction settlement' },
          industry: { type: 'string', example: 'Fintech' },
          budgetUsd: { type: 'number', example: 600 }
        }
      },
      MatchResult: {
        type: 'object',
        properties: {
          expertId: { type: 'string' },
          score: { type: 'number', example: 0.92 },
          subScores: {
            type: 'object',
            properties: {
              semanticSimilarity: { type: 'number' },
              skillsOverlap: { type: 'number' },
              industryMatch: { type: 'number' },
              experienceRatingScore: { type: 'number' },
              bookingLikelihood: { type: 'number' }
            }
          },
          explanation: {
            type: 'object',
            properties: {
              matchedSkills: { type: 'array', items: { type: 'string' } },
              industryOverlap: { type: 'boolean' },
              semanticSimilarity: { type: 'number' },
              relevantPastEngagements: { type: 'array', items: { type: 'string' } },
              summary: { type: 'string' }
            }
          },
          expert: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              headline: { type: 'string' },
              hourlyRateUsd: { type: 'number' },
              rating: { type: 'number' },
              industries: { type: 'array', items: { type: 'string' } },
              skills: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      },
      CreateBookingRequest: {
        type: 'object',
        required: ['queryId', 'expertId', 'scheduledAt', 'durationMin', 'ratePerHourUsd'],
        properties: {
          queryId: { type: 'string' },
          expertId: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' },
          durationMin: { type: 'number', example: 45 },
          ratePerHourUsd: { type: 'number', example: 350 }
        }
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          queryId: { type: 'string' },
          expertId: { type: 'string' },
          clientId: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' },
          durationMin: { type: 'number' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] },
          ratePerHourUsd: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health & Observability'],
        summary: 'Platform health status',
        responses: {
          200: {
            description: 'Services health status',
            content: { 'application/json': { schema: { type: 'object' } } }
          }
        }
      }
    },
    '/api/health/liveness': {
      get: {
        tags: ['Health & Observability'],
        summary: 'Kubernetes/Docker liveness probe',
        responses: { 200: { description: 'Alive' } }
      }
    },
    '/api/health/readiness': {
      get: {
        tags: ['Health & Observability'],
        summary: 'Kubernetes/Docker readiness probe',
        responses: { 200: { description: 'Ready' } }
      }
    },
    '/metrics': {
      get: {
        tags: ['Health & Observability'],
        summary: 'Prometheus metrics scrape target',
        responses: {
          200: { description: 'Text format Prometheus metrics' }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } }
        },
        responses: {
          201: { description: 'Registration successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          409: { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user data' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate refresh token and issue new access token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } }
        },
        responses: {
          200: { description: 'New token pair issued' },
          401: { description: 'Invalid or reused token' }
        }
      }
    },
    '/api/experts': {
      get: {
        tags: ['Experts'],
        summary: 'List experts with pagination and filtering',
        parameters: [
          { name: 'industry', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'List of experts' }
        }
      }
    },
    '/api/experts/{id}': {
      get: {
        tags: ['Experts'],
        summary: 'Get expert profile by user ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Expert profile' },
          404: { description: 'Expert not found' }
        }
      }
    },
    '/api/experts/me': {
      put: {
        tags: ['Experts'],
        summary: 'Update own expert profile and re-generate 384-dim embedding',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile updated with new embedding' },
          403: { description: 'Forbidden (EXPERT role only)' }
        }
      }
    },
    '/api/experts/search/hybrid': {
      get: {
        tags: ['Experts'],
        summary: 'Hybrid search merging keyword and semantic vector search with RRF',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'industry', in: 'query', schema: { type: 'string' } },
          { name: 'minRate', in: 'query', schema: { type: 'number' } },
          { name: 'maxRate', in: 'query', schema: { type: 'number' } }
        ],
        responses: {
          200: { description: 'Ranked expert results with facet counts' }
        }
      }
    },
    '/api/queries': {
      post: {
        tags: ['Queries'],
        summary: 'Create a new research query',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateQueryRequest' } } }
        },
        responses: {
          201: { description: 'Query created' }
        }
      },
      get: {
        tags: ['Queries'],
        summary: 'List own research queries',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of queries' }
        }
      }
    },
    '/api/queries/{id}': {
      get: {
        tags: ['Queries'],
        summary: 'Get query details with persisted matches',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Query details' }
        }
      }
    },
    '/api/queries/{id}/match': {
      post: {
        tags: ['Matching'],
        summary: 'Trigger ML matching pipeline for query',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sync', in: 'query', schema: { type: 'boolean' }, description: 'Run synchronously instead of BullMQ queue' }
        ],
        responses: {
          200: { description: 'Matching results (if sync=true)' },
          202: { description: 'Job accepted for background execution in BullMQ match-queue' }
        }
      }
    },
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Create a consultation booking with idempotency and double-booking protection',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'Idempotency-Key', in: 'header', schema: { type: 'string' }, description: 'UUID to prevent accidental duplicate bookings' }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBookingRequest' } } }
        },
        responses: {
          201: { description: 'Booking created' },
          409: { description: 'Double-booking conflict (slot already reserved)' }
        }
      },
      get: {
        tags: ['Bookings'],
        summary: 'List bookings for current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of bookings' }
        }
      }
    },
    '/api/bookings/{id}/status': {
      patch: {
        tags: ['Bookings'],
        summary: 'Update booking status (CONFIRMED, COMPLETED, CANCELLED)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['CONFIRMED', 'COMPLETED', 'CANCELLED'] } } } } }
        },
        responses: {
          200: { description: 'Booking status updated' }
        }
      }
    },
    '/api/feedback/suggestion': {
      post: {
        tags: ['Feedback & Retraining'],
        summary: 'Rate a suggested expert match (relevant / not relevant)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { queryId: { type: 'string' }, expertId: { type: 'string' }, isRelevant: { type: 'boolean' } } } } }
        },
        responses: {
          200: { description: 'Feedback logged for retraining pipeline' }
        }
      }
    },
    '/api/feedback/consultation': {
      post: {
        tags: ['Feedback & Retraining'],
        summary: 'Rate a completed consultation (1-5 stars)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { bookingId: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 } } } } }
        },
        responses: {
          200: { description: 'Review saved and expert rating updated' }
        }
      }
    },
    '/api/feedback/admin/retrain-now': {
      post: {
        tags: ['Feedback & Retraining'],
        summary: 'Trigger ML ranker retraining pipeline and hot-reload in FastAPI',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Retraining completed and model hot-reloaded' }
        }
      }
    },
    '/api/assistant/structure-query': {
      post: {
        tags: ['AI Assistant'],
        summary: 'Turn vague client notes into structured query with clarifying questions',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { rawText: { type: 'string' } } } } }
        },
        responses: {
          200: { description: 'Structured query with clarifying questions' }
        }
      }
    },
    '/api/assistant/expert-brief': {
      post: {
        tags: ['AI Assistant'],
        summary: 'Generate pre-call briefing for an upcoming expert consultation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { queryId: { type: 'string' }, expertId: { type: 'string' } } } } }
        },
        responses: {
          200: { description: 'Pre-call consultation briefing' }
        }
      }
    },
    '/api/analytics/overview': {
      get: {
        tags: ['Analytics'],
        summary: 'Platform overview KPIs and metrics (ADMIN only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Platform analytics overview' },
          403: { description: 'Forbidden (ADMIN role required)' }
        }
      }
    },
    '/api/jobs/admin/queue-health': {
      get: {
        tags: ['Jobs & Queues'],
        summary: 'BullMQ queues health status and job counts',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Queue metrics (waiting, active, completed, failed)' }
        }
      }
    }
  }
};
