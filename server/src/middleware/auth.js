'use strict';
const jwt = require('jsonwebtoken');
const db  = require('../db/database');

/**
 * Verifies the JWT access token from Authorization: Bearer <token>
 * Attaches req.user = { id, email, role, full_name }
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Verify user still exists and is active
    const user = db.prepare('SELECT id,email,role,full_name,is_active FROM users WHERE id=?').get(payload.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'User not found or deactivated.' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired.' });
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Middleware factory — requires one of the listed roles.
 * Usage: requireRole('doctor') or requireRole(['doctor','admin'])
 */
function requireRole(...roles) {
  const allowed = roles.flat();
  return [requireAuth, (req, res, next) => {
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient role.' });
    }
    next();
  }];
}

module.exports = { requireAuth, requireRole };
