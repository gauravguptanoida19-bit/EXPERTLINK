import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.definition';

const router = Router();

// Raw JSON spec
router.get('/spec.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(openApiSpec);
});

// Swagger UI Explorer
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiSpec));

export const docsRouter = router;
