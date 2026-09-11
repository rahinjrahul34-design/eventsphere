const router = require('express').Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const l = require('../controllers/liveController');

// Live state (public for approved events; owner flag included)
router.get('/events/:id/live', optionalAuth, l.liveState);

// Announcements
router.post('/events/:id/announcements', requireAuth, l.createAnnouncement);
router.delete('/announcements/:announcementId', requireAuth, l.deleteAnnouncement);

// Polls
router.post('/events/:id/polls', requireAuth, l.createPoll);
router.post('/polls/:pollId/vote', requireAuth, l.votePoll);
router.post('/polls/:pollId/close', requireAuth, l.closePoll);

// Q&A
router.post('/events/:id/questions', requireAuth, l.askQuestion);
router.post('/questions/:questionId/upvote', requireAuth, l.upvoteQuestion);
router.post('/questions/:questionId/answer', requireAuth, l.answerQuestion);

// Chat (REST fallback; realtime via Socket.IO)
router.get('/events/:id/messages', optionalAuth, l.chatHistory);
router.post('/events/:id/messages', requireAuth, l.postChat);

module.exports = router;
