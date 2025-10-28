// CHECK IF USER IS ADMIN
const adminAuth = (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'Admin access required' 
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = adminAuth;