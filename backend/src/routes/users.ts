// Placeholder routes - sẽ được điền vào sau
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'User routes' });
});

export default router;
