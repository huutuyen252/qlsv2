import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Schedule routes' });
});

export default router;
