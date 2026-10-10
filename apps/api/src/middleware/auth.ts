import { Request, Response, NextFunction } from 'express';
import { authService, JwtPayload } from '../modules/auth/auth.service';
import { UnauthorizedError, ForbiddenError } from './error-handler';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = authService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Requires one of [${allowedRoles.join(', ')}] role, but you are '${req.user.role}'`
        )
      );
    }

    next();
  };
}
