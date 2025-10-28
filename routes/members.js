const express = require('express');
const { getAllMembers, updateProfile, changePassword, getMyComments } = require('../controllers/memberController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/authAdmin');
const router = express.Router();

router.get('/collectors', auth, adminAuth, getAllMembers); // TASK 4
router.put('/:id', auth, updateProfile);
router.put('/password', auth, changePassword);
router.get('/comments', auth, getMyComments);

module.exports = router;