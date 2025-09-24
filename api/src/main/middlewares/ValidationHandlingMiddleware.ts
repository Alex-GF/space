import { NextFunction } from 'express';
import { Result, ValidationError, validationResult } from 'express-validator';

const handleValidation = async (req: any, res: any, next: NextFunction) => {
  const err = validationResult(req) as Result<ValidationError>;

  if (err.array().length > 0) {
    const first = err.array()[0];
    const message = first && (first.msg as unknown as string) ? (first.msg as unknown as string) : 'Invalid request';
    res.status(422).send({ error: message });
  } else {
    next();
  }
};

export { handleValidation };
