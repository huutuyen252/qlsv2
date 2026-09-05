import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Student routes' });
});

export default router;
