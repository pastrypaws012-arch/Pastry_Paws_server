import express from 'express';

const router = express.Router();

const ADMIN_ID = 'Pastrypaws';
const ADMIN_PASSWORD = 'P@stry0123';

// POST /api/auth/admin-login
router.post('/admin-login', (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID and password are required',
      });
    }

    const cleanId = String(adminId).trim();
    const cleanPassword = String(password);

    if (
      cleanId.toLowerCase() === ADMIN_ID.toLowerCase() &&
      cleanPassword === ADMIN_PASSWORD
    ) {
      // Successful authentication
      const sessionToken = `pp-sec-${Buffer.from(cleanId + ':' + Date.now()).toString('base64')}`;
      return res.json({
        success: true,
        message: 'Authentication successful',
        adminId: ADMIN_ID,
        token: sessionToken,
        timestamp: new Date().toISOString(),
      });
    }

    // Invalid credentials
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Invalid Admin ID or Password',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error: ' + error.message,
    });
  }
});

export default router;
