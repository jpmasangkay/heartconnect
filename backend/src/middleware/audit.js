// Audit logging middleware

const auditLog = (action, userId, details) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userId,
    ...details,
  };
  
  // In production, send to logging service (ELK, Splunk, CloudWatch, etc.)
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify(logEntry));
  }
};

const logSecurityEvent = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Log on authentication events
    if (req.path === '/api/auth/login') {
      auditLog('LOGIN_ATTEMPT', req.body?.email, {
        success: res.statusCode === 200,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }
    
    if (req.path === '/api/auth/register') {
      auditLog('USER_REGISTRATION', data?.user?._id, {
        email: req.body?.email,
        role: req.body?.role,
        ip: req.ip,
      });
    }
    
    if (req.path === '/api/auth/password') {
      auditLog('PASSWORD_CHANGE', req.user?._id, {
        email: req.user?.email,
        ip: req.ip,
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = { auditLog, logSecurityEvent };
