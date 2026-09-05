import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Grade routes' });
});

export default router;
