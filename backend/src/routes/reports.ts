import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Reports routes' });
});

export default router;
